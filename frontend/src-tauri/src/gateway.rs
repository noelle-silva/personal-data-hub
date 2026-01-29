use std::{
  net::SocketAddr,
  sync::{Arc, RwLock},
};

use axum::{
  body::Body,
  extract::{Path, State},
  http::{HeaderMap, HeaderName, HeaderValue, Method, Request, StatusCode},
  response::Response,
  routing::{any, get},
  Router,
};
use futures_util::StreamExt;
use reqwest::Client;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone, Default)]
pub struct GatewayConfig {
  pub backend_base_url: Option<String>,
  pub bearer_token: Option<String>,
}

#[derive(Clone)]
struct AppState {
  client: Client,
  config: Arc<RwLock<GatewayConfig>>,
}

fn is_hop_by_hop_header(name: &HeaderName) -> bool {
  matches!(
    name.as_str().to_ascii_lowercase().as_str(),
    "connection"
      | "keep-alive"
      | "proxy-authenticate"
      | "proxy-authorization"
      | "te"
      | "trailer"
      | "transfer-encoding"
      | "upgrade"
  )
}

fn copy_request_headers(req_headers: &HeaderMap, target: &mut reqwest::header::HeaderMap) {
  for (name, value) in req_headers.iter() {
    if is_hop_by_hop_header(name) {
      continue;
    }

    if name.as_str().eq_ignore_ascii_case("host") {
      continue;
    }

    target.insert(name.clone(), value.clone());
  }
}

fn copy_response_headers(src: &reqwest::header::HeaderMap, dst: &mut HeaderMap) {
  for (name, value) in src.iter() {
    if let Ok(hn) = HeaderName::from_bytes(name.as_str().as_bytes()) {
      if is_hop_by_hop_header(&hn) {
        continue;
      }
    } else {
      continue;
    }
 
    // 本地网关不需要后端的 Set-Cookie
    if name.as_str().eq_ignore_ascii_case("set-cookie") {
      continue;
    }

    // 后端默认 Helmet 会下发 CORP: same-origin，跨 origin 加载附件会被 WebView 直接拦掉
    // 桌面端统一由本机网关负责资源策略，因此过滤上游的同名头，稍后由网关重写为 cross-origin
    if name
      .as_str()
      .eq_ignore_ascii_case("cross-origin-resource-policy")
    {
      continue;
    }

    if let (Ok(hn), Ok(hv)) = (
      HeaderName::from_bytes(name.as_str().as_bytes()),
      HeaderValue::from_bytes(value.as_bytes()),
    ) {
      dst.append(hn, hv);
    }
  }
}

async fn proxy_attachment(
  State(state): State<AppState>,
  Path(id): Path<String>,
  method: Method,
  headers: HeaderMap,
) -> Result<Response, StatusCode> {
  let (backend_base_url, bearer_token) = {
    let cfg = state
      .config
      .read()
      .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    (cfg.backend_base_url.clone(), cfg.bearer_token.clone())
  };

  let backend_base_url = backend_base_url.ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
  if id.trim().is_empty() {
    return Err(StatusCode::BAD_REQUEST);
  }

  let url = format!("{}/api/attachments/{}", backend_base_url, id);
  let mut req = state.client.request(method.clone(), url);

  let mut out_headers = reqwest::header::HeaderMap::new();
  copy_request_headers(&headers, &mut out_headers);

  if !out_headers.contains_key(reqwest::header::AUTHORIZATION) {
    if let Some(token) = bearer_token {
      if !token.trim().is_empty() {
        let value = format!("Bearer {}", token.trim());
        if let Ok(hv) = reqwest::header::HeaderValue::from_str(&value) {
          out_headers.insert(reqwest::header::AUTHORIZATION, hv);
        }
      }
    }
  }

  req = req.headers(out_headers);

  let resp = req.send().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
  let status = resp.status();
  let upstream_headers = resp.headers().clone();

  let mut response = if method == Method::HEAD {
    Response::builder()
      .status(status)
      .body(Body::empty())
      .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
  } else {
    let stream = resp.bytes_stream().map(|chunk| {
      chunk.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    });
    let body = Body::from_stream(stream);

    Response::builder()
      .status(status)
      .body(body)
      .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
  };

  copy_response_headers(&upstream_headers, response.headers_mut());
  // 允许任意 origin 嵌入本机网关提供的附件资源（img/video/audio/object 等）
  response.headers_mut().insert(
    HeaderName::from_static("cross-origin-resource-policy"),
    HeaderValue::from_static("cross-origin"),
  );
  Ok(response)
}

async fn proxy_api(
  State(state): State<AppState>,
  Path(path): Path<String>,
  req: Request<Body>,
) -> Result<Response, StatusCode> {
  let (backend_base_url, bearer_token) = {
    let cfg = state
      .config
      .read()
      .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    (cfg.backend_base_url.clone(), cfg.bearer_token.clone())
  };

  let backend_base_url = backend_base_url.ok_or(StatusCode::SERVICE_UNAVAILABLE)?;

  let (parts, body) = req.into_parts();
  let method = parts.method;
  let headers = parts.headers;
  let query = parts.uri.query().unwrap_or("");

  let trimmed = path.trim_start_matches('/');
  let mut url = format!("{}/api/{}", backend_base_url, trimmed);
  if !query.is_empty() {
    url.push('?');
    url.push_str(query);
  }

  let mut out_headers = reqwest::header::HeaderMap::new();
  copy_request_headers(&headers, &mut out_headers);

  // 统一从网关状态注入 token（前端不需要/也不应该每次都带 Authorization）
  out_headers.remove(reqwest::header::AUTHORIZATION);
  if let Some(token) = bearer_token {
    if !token.trim().is_empty() {
      let value = format!("Bearer {}", token.trim());
      if let Ok(hv) = reqwest::header::HeaderValue::from_str(&value) {
        out_headers.insert(reqwest::header::AUTHORIZATION, hv);
      }
    }
  }

  // 给后端一个明确的客户端标识（不走浏览器 CORS 了，这个头不会再坑你）
  if !out_headers.contains_key("x-pdh-client") {
    let hv = reqwest::header::HeaderValue::from_static("tauri");
    out_headers.insert(
      reqwest::header::HeaderName::from_static("x-pdh-client"),
      hv,
    );
  }

  let stream = body.into_data_stream().map(|chunk| {
    chunk.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
  });
  let body = reqwest::Body::wrap_stream(stream);

  let resp = state
    .client
    .request(method.clone(), url)
    .headers(out_headers)
    .body(body)
    .send()
    .await
    .map_err(|_| StatusCode::BAD_GATEWAY)?;

  let status = resp.status();
  let upstream_headers = resp.headers().clone();

  let mut response = if method == Method::HEAD {
    Response::builder()
      .status(status)
      .body(Body::empty())
      .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
  } else {
    let stream = resp.bytes_stream().map(|chunk| {
      chunk.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    });
    let body = Body::from_stream(stream);

    Response::builder()
      .status(status)
      .body(body)
      .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
  };

  copy_response_headers(&upstream_headers, response.headers_mut());
  response.headers_mut().insert(
    HeaderName::from_static("cross-origin-resource-policy"),
    HeaderValue::from_static("cross-origin"),
  );
  Ok(response)
}

pub async fn start_gateway(
  config: Arc<RwLock<GatewayConfig>>,
) -> Result<(SocketAddr, tokio::task::JoinHandle<()>), String> {
  let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
    .await
    .map_err(|e| format!("bind gateway failed: {e}"))?;

  let addr = listener
    .local_addr()
    .map_err(|e| format!("get local addr failed: {e}"))?;

  let state = AppState {
    client: Client::new(),
    config,
  };

  let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods(Any)
    .allow_headers(Any)
    .expose_headers(Any);

  let app = Router::new()
    .route("/attachments/:id", get(proxy_attachment).head(proxy_attachment))
    .route("/api/*path", any(proxy_api))
    .layer(cors)
    .with_state(state);

  let handle = tokio::spawn(async move {
    let server = axum::serve(listener, app);
    let _ = server.await;
  });

  Ok((addr, handle))
}
