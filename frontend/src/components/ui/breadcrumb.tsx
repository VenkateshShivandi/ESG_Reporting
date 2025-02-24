"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {}

export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<"ol"> {}

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {}

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean
}

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<"span"> {}

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<"span"> {
  children?: React.ReactNode
  className?: string
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(({ className, ...props }, ref) => (
  <nav
    aria-label="breadcrumb"
    ref={ref}
    className={cn("text-sm [&>ol]:flex [&>ol]:items-center", className)}
    {...props}
  />
))
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(({ className, ...props }, ref) => (
  <ol ref={ref} className={cn("flex flex-wrap items-center gap-1.5", className)} {...props} />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(({ className, ...props }, ref) => (
  <a ref={ref} className={cn("hover:underline hover:opacity-75", className)} {...props} />
))
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("opacity-60", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({ children, className, ...props }: BreadcrumbSeparatorProps) => (
  <span role="presentation" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
    {children || <ChevronRight />}
  </span>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator }

