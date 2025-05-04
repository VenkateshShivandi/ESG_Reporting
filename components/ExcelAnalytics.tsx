import { useState, useEffect, useRef } from "react";

const ExcelAnalytics = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      console.log('--- Overflow Debug ---');
      const container = chartContainerRef.current;
      console.log('Container clientWidth:', container.clientWidth);
      console.log('Container scrollWidth:', container.scrollWidth);

      const children = container.children;
      console.log('Number of children:', children.length);
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        console.log(
          `Child ${i} - Tag: ${child.tagName}, Classes: ${child.className}, offsetWidth: ${child.offsetWidth}, scrollWidth: ${child.scrollWidth}`
        );
      }
      console.log('--- End Overflow Debug ---');
    }
  }, [chartPayloads]);

  return (
    {/* Data Visualization Section */}
    {chartPayloads && chartPayloads.length > 0 && (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Data Visualization</CardTitle>
          <CardDescription>
            Presenting the data from the selected columns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            ref={chartContainerRef} 
            className="space-y-8"
          >
            {chartPayloads.map((payload, index) => {
              return <ChartComponent key={index} {...payload} />;
            })}
          </div>
        </CardContent>
      </Card>
    )}
  );
};

export default ExcelAnalytics; 