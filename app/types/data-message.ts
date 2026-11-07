import { DataMessage, Message } from "ai";

type AssistantDataMessageValues = "message.text";

export interface AssistantDataMessageServer extends DataMessage {
  data: {
    type: AssistantDataMessageValues;
    value: any;
  };
}

export interface AssistantDataMessageClient extends Message {
  data: {
    type: AssistantDataMessageValues;
    value: any;
  };
}
