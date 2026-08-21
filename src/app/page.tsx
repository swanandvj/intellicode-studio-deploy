"use client"
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {Button} from "../components/ui/button"


export default function Home() {
  const createProject = useMutation(api.projects.create)
  const projects=useQuery(api.projects.get)
  return (
    <div className="flex flex-col p-4 gap-2 ">
     <Button onClick={()=>{createProject({
      name:"new project"
      
     }) }}>
      add new
     </Button>
        {projects?.map( (project)=>(
          <div className="flex flex-col p-2 border rounded-3xl " key={project._id}>
              <p>{project.name} </p>
              <p> owner id :{project.ownerID}</p>
          </div>
        ) )}
    </div>
  );
}
