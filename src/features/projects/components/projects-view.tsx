"use client"
import { Poppins } from "next/font/google"
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FaGithub } from "react-icons/fa";
import { SparkleIcon } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { ProjectsList } from "./projects-list";
import { UseCreateProjects } from "../hooks/use-projects";
import { useState,useEffect } from "react";
import {
    adjectives,
    animals,
    colors,
    uniqueNamesGenerator,
} from "unique-names-generator";
import { ProjectCommandDialog } from "./projects-command-dialog";
const font = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
})

export const ProjectsView = () => {

    const createProject = UseCreateProjects();
    const [commandDialogOpen, setcommandDialogOpen] = useState(false)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) =>{
        if(e.metaKey || e.ctrlKey){
            if(e.key === "k"){
                e.preventDefault()
                setcommandDialogOpen(true)
            }
        }
      }
      document.addEventListener("keydown" , handleKeyDown)
      return () => document.removeEventListener("keydown",handleKeyDown)
    }, [])
    
    return (
        <>
        <ProjectCommandDialog
        open={commandDialogOpen}
        onOpenChange={setcommandDialogOpen}/>
        <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-6 md:p-16">
            <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">

                <div className="flex justify-between gap-4 w-full items-center">

                    <div className="flex items-center gap-2 w-full group/logo">
                        <img src="/logo.svg" alt="intellicode" className="size-[32px] md:size-[46px]" />
                        <h1 className={cn(
                            "md:text-4xl text-4xl font-semibold",
                            font.className,
                        )}>
                            Intellicode Studio
                        </h1>
                    </div>
                </div>
                <div className="flex flex-col gap-4 w-full">
                    <div className="grid grid-cols-2 gap-2">

                        <Button
                            variant="outline"
                            onClick={() => {
                                const projectName = uniqueNamesGenerator({
                                    dictionaries: [
                                        adjectives,
                                        animals,
                                        colors,
                                    ],
                                    separator: "-",
                                    length: 3,
                                });

                                createProject({
                                    name: projectName,
                                });
                            }}
                            className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none" >
                            <div className="flex items-center justify-between w-full">
                                <SparkleIcon className="size-4" />
                                <Kbd className="bg-accent border ">ctrl+j</Kbd>
                            </div>
                            <div>
                                <span className="text-sm">
                                    New
                                </span>
                            </div>
                        </Button>
                        <Button
                            variant="outline" onClick={() => { }} className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none" >
                            <div className="flex items-center justify-between w-full">
                                <FaGithub className="size-4" />
                                <Kbd className="bg-accent border ">ctrl+i</Kbd>
                            </div>
                            <div>
                                <span className="text-sm">
                                    Import
                                </span>
                            </div>
                        </Button>
                    </div>
                    <ProjectsList onViewAll={() =>  setcommandDialogOpen(true)} />
                </div>

            </div>
        </div>
        </>
    )
    
} 