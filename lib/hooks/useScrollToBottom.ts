// import { RefObject, useEffect, useRef } from "react";

// export function useScrollToBottom(
//   divRef: RefObject<HTMLDivElement>,
//   dependencies: any[]
// ) {
//   const isNearBottomRef = useRef(true);

//   useEffect(() => {
//     const div = divRef.current;
//     if (!div) return;

//     const handleScroll = () => {
//       const { scrollTop, scrollHeight, clientHeight } = div;
//       const scrollThreshold = 100;
//       isNearBottomRef.current =
//         scrollHeight - (scrollTop + clientHeight) < scrollThreshold;
//     };

//     div.addEventListener("scroll", handleScroll);
//     return () => div.removeEventListener("scroll", handleScroll);
//   }, [divRef]);

//   useEffect(() => {
//     if (isNearBottomRef.current) {
//       scrollToBottom(divRef);
//     }
//   }, dependencies);
// }

// export const scrollToBottom = (divRef: RefObject<HTMLDivElement>) => {
//   const div = divRef.current;
//   if (!div) return;

//   const scrollHeight = div.scrollHeight;
//   const height = div.clientHeight;
//   const maxScrollTop = scrollHeight - height;

//   div.scrollTo({
//     top: maxScrollTop,
//     behavior: "smooth",
//   });
// };


// useScrollToBottom.ts
import { RefObject, useEffect, useRef } from "react";

export function useScrollToBottom(divRef: RefObject<HTMLDivElement>) {
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = div;
      const scrollThreshold = 100;
      isNearBottomRef.current =
        scrollHeight - (scrollTop + clientHeight) < scrollThreshold;
    };

    div.addEventListener("scroll", handleScroll);
    return () => div.removeEventListener("scroll", handleScroll);
  }, [divRef]);

  const triggerScrollToBottom = () => {
    const div = divRef.current;
    if (!div || !isNearBottomRef.current) return;

    const scrollHeight = div.scrollHeight;
    const height = div.clientHeight;
    const maxScrollTop = scrollHeight - height;

    div.scrollTo({
      top: maxScrollTop,
      behavior: "smooth",
    });
  };

  return { triggerScrollToBottom };
}
