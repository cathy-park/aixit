import { ChatbotWarehouseView } from "@/components/chatbots/ChatbotWarehouseView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "챗봇 창고 | AIXIT",
};

export default function ChatbotsPage() {
  return <ChatbotWarehouseView />;
}
