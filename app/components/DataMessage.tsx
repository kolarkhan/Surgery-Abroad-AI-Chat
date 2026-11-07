
import { AssistantDataMessageClient } from "../types/data-message";
import PossibleQuestions from "./PossibleQuestions";

const DataMessage = ({
  message,
  onQuestionClick,
}: {
  message: AssistantDataMessageClient;
  onQuestionClick: (question: string) => void;
}) => {
  if (
    !message.data ||
    message.data.type !== "message.text" ||
    typeof message.data.value !== "string"
  ) {
    return null;
  }

  return (
    <PossibleQuestions
      messageText={message.data.value}
      onQuestionClick={onQuestionClick}
    />
  );
};

export default DataMessage;
