import { configureStore } from '@reduxjs/toolkit';
import documentsReducer from './documentsSlice';
import searchReducer from './searchSlice';
import tagFilterReducer from './tagFilterSlice';
import quotesReducer from './quotesSlice';
import quotesFilterReducer from './quotesFilterSlice';
import attachmentsReducer from './attachmentsSlice';
import windowsReducer from './windowsSlice';
import authReducer from './authSlice';
import customPagesReducer from './customPagesSlice';
import settingsReducer from './settingsSlice';
import wallpaperReducer from './wallpaperSlice';
import transparencyReducer from './transparencySlice';

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    search: searchReducer,
    tagFilter: tagFilterReducer,
    quotes: quotesReducer,
    quotesFilter: quotesFilterReducer,
    attachments: attachmentsReducer,
    windows: windowsReducer,
    auth: authReducer,
    customPages: customPagesReducer,
    settings: settingsReducer,
    wallpaper: wallpaperReducer,
    transparency: transparencyReducer,
  },
});

export default store;