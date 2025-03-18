import { useState } from "react"

// 图表配置类型
export interface ChartConfig {
  [key: string]: {
    title: string;
    showLegend?: boolean;
    stacked?: boolean;
    dataKeys?: string[];
    dataLabels?: string[];
    colors?: string[];
    [key: string]: any;
  }
}

// 应用于ChartGenerator组件的配置接口
export interface ChartGeneratorConfig {
  chartType: string;
  dataSource: string;
  title: string;
  showLegend: boolean;
  stacked: boolean;
  colors: string[];
  dataKeys: string[];
  dataLabels: string[];
}

// 使用类型保护来增强类型安全
export function isChartGeneratorConfig(config: any): config is ChartGeneratorConfig {
  return config && 
    typeof config.chartType === 'string' &&
    typeof config.dataSource === 'string' &&
    typeof config.title === 'string';
}

interface UseChartConfigProps {
  initialConfig?: ChartConfig;
}

interface UseChartConfigReturn {
  config: ChartConfig;
  updateConfig: (chartKey: string, updates: Partial<ChartConfig[string]>) => void;
  resetConfig: (newConfig?: ChartConfig) => void;
  setChartInteractivity: (chartKey: string, interactive: boolean) => void;
}

// 图表配置的默认值
const defaultConfig: ChartConfig = {
  barChart: {
    title: "Bar Chart",
    showLegend: true,
    stacked: false,
    dataKeys: ["value1", "value2", "value3"],
    dataLabels: ["Series 1", "Series 2", "Series 3"],
    colors: ["#4CAF50", "#81C784", "#C8E6C9"]
  },
  donutChart: {
    title: "Donut Chart",
    showLegend: true,
    innerRadius: 60,
    outerRadius: 80,
    colors: ["#4CAF50", "#81C784", "#C8E6C9", "#E8F5E9", "#AED581"]
  },
  lineChart: {
    title: "Line Chart",
    showLegend: true,
    showDots: true,
    dataKeys: ["value1", "value2", "value3"],
    dataLabels: ["Series 1", "Series 2", "Series 3"],
    colors: ["#4CAF50", "#2196F3", "#FFC107"]
  },
  heatmap: {
    title: "Heatmap",
    dataKeys: ["value1", "value2", "value3", "value4"],
    showLegend: true
  },
  radarChart: {
    title: "Radar Chart",
    dataKeys: ["value1", "value2", "value3"],
    colors: ["#4CAF50", "#2196F3", "#FFC107"]
  }
}

// 自定义钩子用于管理图表配置
export function useChartConfig(props?: UseChartConfigProps): UseChartConfigReturn {
  const initialConfig = props?.initialConfig || defaultConfig;
  const [config, setConfig] = useState<ChartConfig>(initialConfig);

  // 更新特定图表的配置
  const updateConfig = (chartKey: string, updates: Partial<ChartConfig[string]>) => {
    setConfig(prev => ({
      ...prev,
      [chartKey]: {
        ...prev[chartKey],
        ...updates
      }
    }));
  };

  // 重置配置为默认值或提供的新配置
  const resetConfig = (newConfig?: ChartConfig) => {
    setConfig(newConfig || defaultConfig);
  };

  // 设置图表的交互性
  const setChartInteractivity = (chartKey: string, interactive: boolean) => {
    setConfig(prev => ({
      ...prev,
      [chartKey]: {
        ...prev[chartKey],
        interactive
      }
    }));
  };

  return {
    config,
    updateConfig,
    resetConfig,
    setChartInteractivity
  };
}

// 用于将自定义配置应用到图表的辅助函数
export function applyChartConfig(defaultConfig: any, userConfig: any) {
  return {
    ...defaultConfig,
    ...userConfig
  };
} 