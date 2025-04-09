import { configureStore } from "@reduxjs/toolkit";
import notificacionReducer from './notificacionSlice';

const store = configureStore({
  reducer: {
    notificaciones: notificacionReducer,
  },
});

export default store;