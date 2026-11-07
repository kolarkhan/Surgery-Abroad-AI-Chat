import React from "react";

interface TooltipButtonProps {
  text: string;
  children: React.ReactElement;
}

const TooltipButton: React.FC<TooltipButtonProps> = ({ text, children }) => {
  return React.cloneElement(children, {
    title: text,
    "aria-label": children.props["aria-label"] ?? text,
  });
};

export default TooltipButton;
