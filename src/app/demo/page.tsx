"use client"

import { METHODS } from "node:http"
import { Button } from "@/components/ui/button";
import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { useAuth } from "@clerk/nextjs";



export default function DemoPage() {
    const [loading, setloading] = useState(false)
    const [loading1, setloading1] = useState(false)
    const {userId}= useAuth() 


    const handleReq = async () => {
        setloading(true)
        await fetch("/api/demo/blocking", { method: "POST" })
        setloading(false)
    }
    const handleBack = async () => {
        setloading1(true)
        await fetch("/api/demo/background", { method: "POST" })
        setloading1(false)
    }
    //handle client error 
    const handleClientError = () => {
        Sentry.logger.info("user attempting to click on client function ", {userId} )
        throw new Error("Client Error ! something wrong in the browser ")
    }

    // handle API error
    const handleApiError = async () => {
        fetch("/api/demo/error", { method: "POST" })
    }
    // handle inngest error
    const handleInngestError = async () => {
        fetch("/api/demo/inngest-error", { method: "POST" })
    }



    return (

        <div className="p-5 flex gap-3">
            <Button disabled={loading} onClick={handleReq}   >
                {
                    loading ? "Loading..." : "blocking"
                }
            </Button>
            <Button disabled={loading1} onClick={handleBack}  >
                {
                    loading1 ? "Loading..." : "background"
                }
            </Button>
            <Button variant="destructive" onClick={handleClientError} >
                Client Error
            </Button>
            <Button
                variant="destructive"
                onClick={handleApiError}
            >
                API Error
            </Button>
            <Button
                variant="destructive"
                onClick={handleInngestError}
            >
                Inngest Error
            </Button>
        </div>

    )
}