/// <reference types="nativewind/types" />

// Metro (via withNativeWind) handles bundling global.css; TS just needs to know
// side-effect imports of .css files are valid.
declare module '*.css';
