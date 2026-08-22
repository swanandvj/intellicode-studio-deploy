"use client"

import { METHODS } from "node:http"
import { Button } from "@/components/ui/button";
import { useState } from "react";



export default function DemoPage() {
    const [loading, setloading] = useState(false)
    const [loading1, setloading1] = useState(false)
    
    
    const handleReq =async () =>{
        setloading(true)
    await fetch("/api/demo/blocking",{method:"POST"})
        setloading(false)
}
    const handleBack =async () =>{
        setloading1(true)
    await fetch("/api/demo/background",{method:"POST"})
        setloading1(false)
}




    return (
    
    <div>
        <Button disabled={loading} onClick={handleReq}  >
            {
                loading? "Loading...":"blocking"
            }
        </Button>
        <Button disabled={loading1} onClick={handleBack}  >
            {
                loading1? "Loading...":"background"
            }
        </Button>
    </div>
    
)
}