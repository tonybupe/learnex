import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import FeedCard from "./FeedCard";

export default function LearningFeed() {

const { data, isLoading } = useQuery({
queryKey: ["feed"],
queryFn: async () => {
const res = await api.get(endpoints.posts.feed);
return res.data;
}
});

if (isLoading) {
return <div>Loading feed...</div>;
}

return (

<div className="feed">

{data?.map((post:any) => (
<FeedCard key={post.id} post={post}/>
))}

</div>

);

}