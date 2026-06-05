import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";
import FriendCard from "../components/FriendCard";

const FriendsPage = () => {
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  if (isLoading) {
    return <span className="loading loading-spinner loading-lg" />;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Your Friends</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {friends.map((friend) => (
          <FriendCard key={friend._id} friend={friend} />
        ))}
      </div>
    </div>
  );
};

export default FriendsPage;