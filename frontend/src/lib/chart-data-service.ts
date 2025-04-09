import { useDashboardStore } from "./store";

// 数据源类型定义
export type DataSourceType = 'reports' | 'manual' | 'chunks';

// 图表数据接口
export interface ChartData {
  [key: string]: any[];
}

// 图表数据服务类
class ChartDataService {
  // 从报告获取数据
  getReportData(chartType: string): any[] {
    const { chartData } = useDashboardStore.getState();
    
    switch (chartType) {
      case 'bar':
        return chartData.barChart;
      case 'donut':
        return chartData.donutChart;
      case 'line':
        return chartData.lineChart;
      case 'radar':
        return chartData.radarChart;
      case 'heatmap':
        return chartData.heatmap;
      default:
        return [];
    }
  }

  // 处理手动输入的数据
  processManualData(data: any[], chartType: string): any[] {
    // 不同图表类型可能需要不同的数据格式
    switch (chartType) {
      case 'donut':
        // Donut图表需要特定的数据格式
        return data.map(item => ({ 
          name: item.name, 
          value: item.value1 
        }));
      case 'radar':
        // Radar图表需要特定的数据格式
        return data.map(item => ({
          subject: item.name,
          value1: item.value1,
          value2: item.value2,
          value3: item.value3
        }));
      default:
        // 其他图表类型可以直接使用原始数据
        return data;
    }
  }

  // 从chunks获取数据的接口 (预留)
  async getChunksData(chartType: string, params?: any): Promise<any[]> {
    // 这只是一个预留的接口，实际实现将在未来添加
    console.log('Chunks data source is not yet implemented', { chartType, params });
    
    // 返回一些模拟数据，实际应用中应该从API获取
    return [
      { name: "Chunk 1", value1: 100, value2: 120, value3: 80 },
      { name: "Chunk 2", value1: 150, value2: 100, value3: 120 },
      { name: "Chunk 3", value1: 80, value2: 140, value3: 100 },
    ];
  }

  // 根据数据源类型获取数据的统一接口
  async getData(dataSource: DataSourceType, chartType: string, manualData?: any[]): Promise<any[]> {
    switch (dataSource) {
      case 'reports':
        return this.getReportData(chartType);
      case 'manual':
        return manualData ? this.processManualData(manualData, chartType) : [];
      case 'chunks':
        return await this.getChunksData(chartType);
      default:
        return [];
    }
  }

  // 转换数据格式（用于不同图表类型之间的转换）
  transformDataFormat(data: any[], fromType: string, toType: string): any[] {
    // 实现从一种图表类型转换到另一种图表类型的数据格式
    if (fromType === toType) return data;

    // 举例：从柱状图格式转换为饼图格式
    if (fromType === 'bar' && toType === 'donut') {
      return data.map(item => ({
        name: item.name,
        value: item.value1
      }));
    }

    // 其他转换逻辑...
    
    // 默认返回原数据
    return data;
  }
}

// 导出单例实例
export const chartDataService = new ChartDataService();

// 处理不同数据源的响应钩子
export function useChartData(dataSource: DataSourceType, chartType: string, manualData?: any[]) {
  const fetchData = async () => {
    return await chartDataService.getData(dataSource, chartType, manualData);
  };

  return {
    fetchData
  };
} 