export function startSpan(name: string): { end: () => void } {
  return {
    end: () => {
      void name;
    }
  };
}
