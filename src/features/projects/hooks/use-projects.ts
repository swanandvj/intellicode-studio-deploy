import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";

export const UseProjects = () => {
    return useQuery(api.projects.get)
}
export const UseProjectsPartial = (limit: number) => {
    return useQuery(api.projects.getpartial ,{
        limit
    })
}
export const UseCreateProjects = () =>{
    const {userId }= useAuth()
    return useMutation(api.projects.create).withOptimisticUpdate(
        (localStore,args)=>{
            const existingProjects = localStore.getQuery(api.projects.get)
            if(existingProjects!==undefined){
                const now = Date.now();
                const newProject={
                    _id:crypto.randomUUID() as Id<"projects">,
                    _creationTime: now,
                    name:args.name,
                    ownerID:"anonymous",
                    updatedAt:now,

                }
                localStore.setQuery(api.projects.get,{},[
                    newProject,
                    ...existingProjects,
                ])
            }
        }
    )
} 