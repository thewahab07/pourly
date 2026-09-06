/// <reference types="nativewind/types" />

/**
 * NativeWind's Metro transformer turns the Tailwind entry stylesheet into a
 * module, but ships no type for the side-effect import of it. Declared here
 * rather than in the generated expo-env.d.ts, which is not committed.
 */
declare module '*.css' {
  const content: string;
  export default content;
}
