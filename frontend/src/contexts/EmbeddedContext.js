import React, { createContext, useContext } from 'react';

export const EmbeddedContext = createContext(false);

export const useEmbedded = () => useContext(EmbeddedContext);
