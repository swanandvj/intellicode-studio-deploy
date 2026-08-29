"use client"
import { Authenticated, AuthLoading, ConvexReactClient, Unauthenticated } from "convex/react"
import { ClerkProvider, useAuth} from "@clerk/nextjs"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ThemeProvider } from "./theme-provider"
import { UnauthenticatedView } from "@/features/auth/components/unauthenticated-view"
import React from "react"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const Provider = ({ children }: { children: React.ReactNode }) => {
    return (
        <ClerkProvider>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Authenticated>
                  
                    {children}
                    </Authenticated>
                    <Unauthenticated>
                        <UnauthenticatedView>
                        </UnauthenticatedView>
                    </Unauthenticated>
                    <AuthLoading>
                        Auth Loading ... 
                    </AuthLoading>
                </ThemeProvider>
            </ConvexProviderWithClerk>

        </ClerkProvider>
    )
}