// valorSlice.js
import { createSlice } from '@reduxjs/toolkit';

export const valorSlice = createSlice({
  name: 'valor',
  initialState: 0, // O el valor inicial que desees
  reducers: {
    updateValor: (state, action) => {
      if (action.payload !== undefined) {
        return action.payload;
      }
      return state; // Devuelve el estado actual si no hay cambios
    },
  },
});

export const { updateValor } = valorSlice.actions;
export default valorSlice.reducer;
