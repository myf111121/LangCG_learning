import StudyWorkspace from './study-workspace';
import {parseView,parseWeek} from './learning-navigation';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;
 return <StudyWorkspace initialView={parseView(query.view)} initialWeek={parseWeek(query.week)}/>;
}
