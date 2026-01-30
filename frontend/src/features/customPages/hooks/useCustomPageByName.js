import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearError,
  fetchPageByName,
  selectCurrentPage,
  selectError,
  selectLoading,
} from '../../../store/customPagesSlice';

export const useCustomPageByName = (encodedName) => {
  const dispatch = useDispatch();
  const currentPage = useSelector(selectCurrentPage);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const decodedName = useMemo(() => {
    if (!encodedName) return '';
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return encodedName;
    }
  }, [encodedName]);

  useEffect(() => {
    if (decodedName) {
      dispatch(
        fetchPageByName({
          name: decodedName,
          options: { populate: 'full', include: 'counts,previews' },
        })
      );
    }

    return () => {
      dispatch(clearError());
    };
  }, [dispatch, decodedName]);

  return { currentPage, loading, error, decodedName };
};

