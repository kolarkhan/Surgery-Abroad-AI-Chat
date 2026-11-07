// import { useCallback, useEffect, useState } from "react";

// export function useQuestionSubmit(
//   submitMessage: () => void,
//   setInput: (question: string) => void
// ) {
//   const [isQuestionSelected, setQuestionSelected] = useState(false);

//   const handleQuestionClick = useCallback((question: string) => {
//     setInput(question);
//     setQuestionSelected(true);
//   }, []);

//   useEffect(() => {
//     if (isQuestionSelected) {
//       submitMessage();
//       setQuestionSelected(false);
//     }
//   }, [isQuestionSelected]);

//   return { handleQuestionClick, setQuestionSelected };
// }

import { useCallback, useEffect, useState } from "react";

export function useQuestionSubmit(
  submitMessage: () => void,
  setInput: (question: string) => void
) {
  const [isQuestionSelected, setQuestionSelected] = useState(false);

  const handleQuestionClick = useCallback(
    (question: string) => {
      setInput(question);
      setQuestionSelected(true);
    },
    [setInput] // ✅ include setInput as dependency
  );

  useEffect(() => {
    if (isQuestionSelected) {
      submitMessage();
      setQuestionSelected(false);
    }
  }, [isQuestionSelected, submitMessage]); // ✅ include submitMessage

  return { handleQuestionClick, setQuestionSelected };
}
