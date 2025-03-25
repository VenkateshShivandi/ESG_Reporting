import React, { useState, useRef, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import {
    ZoomIn,
    ZoomOut,
    Download,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Printer
} from "lucide-react"
import { useChartConfig } from "@/hooks/use-chart-config"

interface InteractiveChartWrapperProps {
    children: React.ReactNode
    title?: string
    description?: string
    onRefresh?: () => void
    config?: any
}

export function InteractiveChartWrapper({
    children,
    title = "Chart",
    description,
    onRefresh,
    config,
}: InteractiveChartWrapperProps) {
    // 状态
    const [scale, setScale] = useState(1.0)
    const [fullscreenOpen, setFullscreenOpen] = useState(false)
    const [currentView, setCurrentView] = useState(0)
    const chartRef = useRef<HTMLDivElement>(null)

    // 多视图配置
    const views = [
        { name: "Default", component: children },
        { name: "Detailed", component: children }, // 这里可以传入不同的图表配置
    ]

    // 缩放图表
    const handleZoom = (direction: "in" | "out") => {
        setScale(prev => {
            if (direction === "in") {
                return Math.min(prev + 0.1, 1.5)
            } else {
                return Math.max(prev - 0.1, 0.5)
            }
        })
    }

    // 导出图表为PNG
    const exportToPNG = () => {
        if (!chartRef.current) return

        // 实际应用中应使用canvas或专用库完成导出
        alert("Export functionality will be implemented using canvas or a dedicated library")
    }

    // 打印图表
    const printChart = () => {
        window.print()
    }

    // 切换视图
    const changeView = (direction: "next" | "prev") => {
        setCurrentView(prev => {
            if (direction === "next") {
                return (prev + 1) % views.length
            } else {
                return prev === 0 ? views.length - 1 : prev - 1
            }
        })
    }

    // 刷新图表数据
    const refreshChart = () => {
        if (onRefresh) {
            onRefresh()
        }
    }

    // 添加键盘快捷键支持
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "+" || e.key === "=") {
                handleZoom("in")
            } else if (e.key === "-" || e.key === "_") {
                handleZoom("out")
            } else if (e.key === "ArrowRight") {
                changeView("next")
            } else if (e.key === "ArrowLeft") {
                changeView("prev")
            }
        }

        window.addEventListener("keydown", handleKeyPress)
        return () => window.removeEventListener("keydown", handleKeyPress)
    }, [])

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    {description && <p className="text-sm text-slate-500">{description}</p>}
                </div>
                <div className="flex items-center space-x-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleZoom("in")}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zoom In</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleZoom("out")}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zoom Out</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={exportToPNG}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Export as PNG</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={printChart}>
                                    <Printer className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Print</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={refreshChart}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh Data</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>{title}</DialogTitle>
                                <DialogDescription>{description}</DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-hidden" style={{ height: "calc(90vh - 120px)" }}>
                                {views[currentView].component}
                            </div>
                            <div className="flex justify-between items-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => changeView("prev")}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous View
                                </Button>
                                <div className="text-sm text-center">
                                    {views[currentView].name} ({currentView + 1}/{views.length})
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => changeView("next")}
                                >
                                    Next View <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div
                ref={chartRef}
                className="p-4 transition-all duration-200 ease-in-out overflow-auto"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    height: `calc(300px * ${Math.max(1, 1 / scale)})` // 调整高度以适应缩放
                }}
            >
                {views[currentView].component}
            </div>

            {views.length > 1 && (
                <div className="flex justify-between items-center border-t border-slate-100 p-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => changeView("prev")}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-xs text-slate-500">
                        {views[currentView].name} ({currentView + 1}/{views.length})
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => changeView("next")}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
} 