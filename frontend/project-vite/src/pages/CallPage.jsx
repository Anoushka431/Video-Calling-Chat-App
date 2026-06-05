// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router";
// import useAuthUser from "../hooks/useAuthUser";
// import { useQuery } from "@tanstack/react-query";
// import { getStreamToken } from "../lib/api";

// import {
//   StreamVideo,
//   StreamVideoClient,
//   StreamCall,
//   CallControls,
//   SpeakerLayout,
//   StreamTheme,
//   CallingState,
//   useCallStateHooks,
// } from "@stream-io/video-react-sdk";

// import "@stream-io/video-react-sdk/dist/css/styles.css";
// import toast from "react-hot-toast";
// import PageLoader from "../components/PageLoader";

// const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

// const CallPage = () => {
//   const { id: callId } = useParams();
//   const [client, setClient] = useState(null);
//   const [call, setCall] = useState(null);
//   const [isConnecting, setIsConnecting] = useState(true);

//   const { authUser, isLoading } = useAuthUser();

//   const { data: tokenData } = useQuery({
//     queryKey: ["streamToken"],
//     queryFn: getStreamToken,
//     enabled: !!authUser,
//   });

//   useEffect(() => {
//     const initCall = async () => {
//       if (!tokenData?.token || !authUser || !callId) return;

//       try {
//         console.log("Initializing Stream video client...");

//         const user = {
//           id: authUser._id,
//           name: authUser.fullName,
//           image: authUser.profilePic,
//         };

//         const videoClient = new StreamVideoClient({
//           apiKey: STREAM_API_KEY,
//           user,
//           token: tokenData.token,
//         });

//         const callInstance = videoClient.call("default", callId);

//         await callInstance.join({ create: true });
//       //  console.log(await navigator.mediaDevices.enumerateDevices()); 
//       //   await callInstance.camera.enable();

//         console.log("camera enabled");
//         console.log("Joined call successfully");

//         setClient(videoClient);
//         setCall(callInstance);
//       } catch (error) {
//         console.error("Error joining call:", error);
//         toast.error("Could not join the call. Please try again.");
//       } finally {
//         setIsConnecting(false);
//       }
//     };

//     initCall();
//   }, [tokenData, authUser, callId]);


// //   console.log("authUser:", authUser);
// // console.log("tokenData:", tokenData);
// // console.log("callId:", callId);
// // console.log("isLoading:", isLoading);
// // console.log("isConnecting:", isConnecting);
//   if (isLoading || isConnecting) return <PageLoader />;

//   return (
//     <div className="h-screen flex flex-col items-center justify-center">
//       <div className="relative">
//         {client && call ? (
//           <StreamVideo client={client}>
//             <StreamCall call={call}>
//               <CallContent />
//             </StreamCall>
//           </StreamVideo>
//         ) : (
//           <div className="flex items-center justify-center h-full">
//             <p>Could not initialize call. Please refresh or try again later.</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// const CallContent = () => {
//   const { useCallCallingState } = useCallStateHooks();
//   const callingState = useCallCallingState();

//   const navigate = useNavigate();

//   if (callingState === CallingState.LEFT) return navigate("/");

//   return (
//     <StreamTheme>
//       <SpeakerLayout />
//       <CallControls />
//     </StreamTheme>
//   );
// };

// export default CallPage;


import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const { id: callId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const clientRef = useRef(null);

  const { authUser, isLoading } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initCall = async () => {
      if (!tokenData?.token || !authUser || !callId) return;

      let permissionStream = null;

      try {
        console.log("Initializing Stream video client...");

        // Step 1: Get camera+mic permission upfront — keep stream alive (don't stop yet)
        try {
          permissionStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          // ✅ Do NOT stop tracks here — camera light stays ON
          // We stop AFTER Stream SDK has taken over the device
        } catch (permError) {
  console.warn(
    "Initial permission check failed:",
    permError.name,
    permError.message
  );

  // Don't show an error yet.
  // Let Stream SDK try to start the devices.
}
        // Step 2: Build the Stream user object
        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        // Step 3: Create the Stream video client
        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        clientRef.current = videoClient;

        // Step 4: Create and join the call
        const callInstance = videoClient.call("default", callId);
        await callInstance.join({ create: true });
        console.log("Joined call successfully");

// Step 5: Select real camera and enable
try {
  // ✅ Disable first to reset SDK's internal device cache
  await callInstance.camera.disable();

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  console.log("Available cameras:", videoDevices.map((d) => d.label));

  const realCamera =
    videoDevices.find(
      (d) =>
        !d.label.toLowerCase().includes("virtual") &&
        !d.label.toLowerCase().includes("obs") &&
        !d.label.toLowerCase().includes("snap")
    ) || videoDevices[0];

  if (!realCamera) {
    throw new Error("No real camera found");
  }

  console.log("Selecting camera:", realCamera.label);
  await callInstance.camera.select(realCamera.deviceId);

  // Stop temp stream AFTER SDK has selected the device
  if (permissionStream) {
    permissionStream.getTracks().forEach((t) => t.stop());
    permissionStream = null;
  }

  await callInstance.camera.enable();
  console.log("Camera enabled");
} catch (camError) {
  if (permissionStream) {
    permissionStream.getTracks().forEach((t) => t.stop());
    permissionStream = null;
  }
  console.warn("Camera could not start:", camError.message);
  toast.error("Camera unavailable. Joining without video.");
}

        // Step 6: Enable microphone — isolated so failure won't block the call
        try {
          await callInstance.microphone.enable();
          console.log("Microphone enabled");
        } catch (micError) {
          console.warn("Microphone could not start:", micError.message);
          toast.error("Microphone unavailable. Joining without audio.");
        }

        // Step 7: Set state — always runs even if camera/mic failed
        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        // Only truly fatal errors reach here (bad token, network, etc.)
        console.error("Error joining call:", error);
        toast.error("Could not join the call. Please try again.");

        // Cleanup temp stream on fatal error
        if (permissionStream) {
          permissionStream.getTracks().forEach((t) => t.stop());
        }
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();

    // Cleanup on unmount — releases camera so it's not locked on re-mount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(console.error);
        clientRef.current = null;
      }
    };
  }, [tokenData, authUser, callId]);

  if (isLoading || isConnecting) return <PageLoader />;

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="relative">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Could not initialize call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const navigate = useNavigate();

  if (callingState === CallingState.LEFT) return navigate("/");

  return (
    <StreamTheme>
      <SpeakerLayout />
      <CallControls />
    </StreamTheme>
  );
};

export default CallPage;