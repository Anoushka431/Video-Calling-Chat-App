import { useEffect, useState } from "react";
import { useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

// import {
//   Channel,
//   ChannelHeader,
//   Chat,
//   MessageInput,
//   MessageList,
//   Thread,
//   Window,
// } from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";


///////////////////////

// import type { User, ChannelSort, ChannelFilters, ChannelOptions } from 'stream-chat';
import {
  Chat,
  Channel,
  MessageList,
  MessageComposer,    // ← add this
  Thread,
  Window,
} from "stream-chat-react";
// import { MessageInput } from "stream-chat-react/dist/components";

// import 'stream-chat-react/dist/css/index.css';
// import './layout.css'

//////////////////////

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {
  const { id: targetUserId } = useParams();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser, // this will run only when authUser is available
  });

  useEffect(() => {
    const initChat = async () => {
      if (!tokenData?.token || !authUser) return;

      try {
        console.log("Initializing stream chat client...");

        const client = StreamChat.getInstance(STREAM_API_KEY);

        if (client.userID) return;

        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        //
        const channelId = [authUser._id, targetUserId].sort().join("-");

        // you and me
        // if i start the chat => channelId: [myId, yourId]
        // if you start the chat => channelId: [yourId, myId]  => [myId,yourId]

        const currChannel = client.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [tokenData, authUser, targetUserId]);

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });

      toast.success("Video call link sent successfully!");
    }
  };

  if (loading || !chatClient || !channel) return <ChatLoader />;

  return (
  <div className="h-[93vh]">
    <Chat client={chatClient}>
      <Channel channel={channel}>
        <div className="w-full relative">
          <Window>
            {/* Custom Header */}
            <div className="flex items-center justify-between p-3 border-b bg-white">
              <div className="flex items-center gap-3">
                <img
                  src={channel.state.members[targetUserId]?.user?.image}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">
                    {channel.state.members[targetUserId]?.user?.name}
                  </p>
                  <p className="text-sm text-green-500">Online</p>
                </div>
              </div>
              {/* CallButton moved INSIDE Window */}
              <CallButton handleVideoCall={handleVideoCall} />
            </div>

            <MessageList />
            <MessageComposer />
          </Window>
        </div>
        <Thread />
      </Channel>
    </Chat>
  </div>
);
};
export default ChatPage;