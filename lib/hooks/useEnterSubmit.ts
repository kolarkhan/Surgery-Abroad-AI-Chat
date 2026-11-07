import { useRef, type RefObject } from "react";
import { isMobile } from "react-device-detect";

export function useEnterSubmit(): {
  formRef: RefObject<HTMLFormElement>;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
} {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (!isMobile) {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        formRef.current?.requestSubmit();
        event.preventDefault();
      }
    }
  };

  return { formRef, onKeyDown: handleKeyDown };
}
