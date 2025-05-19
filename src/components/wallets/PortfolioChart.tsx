
import React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface PortfolioChartProps {
  tokenDistribution: ChartData[];
  priceHistory?: Array<{
    date: string;
    price: number;
  }>;
  totalValue: number;
  currentPrice: number;
  priceChange24h: number;
}

const COLORS = [
  "#0042C4", // Royal blue - primary
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Pink
  "#f97316", // Orange
  "#06b6d4", // Cyan
];

const PortfolioChart: React.FC<PortfolioChartProps> = ({
  tokenDistribution,
  priceHistory,
  totalValue,
  currentPrice,
  priceChange24h,
}) => {
  // Calculate total for percentage
  const total = tokenDistribution.reduce((sum, entry) => sum + entry.value, 0);

  // Generate some mock price history data if none is provided
  const priceData = priceHistory || generateMockPriceData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {/* Asset Distribution Chart */}
      <Card className="col-span-1 dark:bg-nostr-cardBg dark:border-white/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Asset Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {tokenDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `$${value.toFixed(2)}`,
                    "Value",
                  ]}
                  labelFormatter={(index: number) =>
                    tokenDistribution[index]?.name || ""
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            {tokenDistribution.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      entry.color || COLORS[index % COLORS.length],
                  }}
                ></div>
                <div className="flex justify-between w-full">
                  <span>{entry.name}</span>
                  <span>{((entry.value / total) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price History Chart */}
      <Card className="col-span-2 dark:bg-nostr-cardBg dark:border-white/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex justify-between items-center">
            <span>ALPH Price History</span>
            <span className="text-sm font-normal">
              ${currentPrice.toFixed(2)}{" "}
              <span
                className={
                  priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {priceChange24h >= 0 ? "+" : ""}
                {priceChange24h.toFixed(2)}%
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ChartContainer
              config={{
                price: {
                  label: "Price",
                  theme: {
                    light: "#0042C4", // Royal blue
                    dark: "#0042C4", // Royal blue
                  },
                },
                volume: {
                  label: "Volume",
                  theme: {
                    light: "rgba(99, 102, 241, 0.2)", // Indigo transparent
                    dark: "rgba(99, 102, 241, 0.2)", // Indigo transparent
                  },
                },
              }}
            >
              <AreaChart
                data={priceData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#0042C4"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="#0042C4"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(tick) => tick}
                  tick={{ fontSize: 10 }}
                  tickMargin={5}
                />
                <YAxis
                  tickFormatter={(tick) => `$${tick}`}
                  tick={{ fontSize: 10 }}
                  domain={["dataMin - 0.01", "dataMax + 0.01"]}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelClassName="text-xs"
                      formatter={(value: number) => [
                        `$${value.toFixed(3)}`,
                        "Price",
                      ]}
                    />
                  }
                />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#0042C4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Generate mock price history data
const generateMockPriceData = () => {
  const data = [];
  const today = new Date();
  const basePrice = 0.38; // Starting price
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate a price with some realistic fluctuations
    let randomChange = Math.random() * 0.02 - 0.01; // Random change between -1% and +1%
    
    // Add some trends to make it look more realistic
    if (i % 7 === 0) randomChange = Math.random() * 0.03; // Occasional small jump up
    if (i % 5 === 0) randomChange = -Math.random() * 0.02; // Occasional small dip
    
    const price = basePrice * (1 + (0.2 * Math.sin(i / 10)) + randomChange);
    
    data.push({
      date: formatDate(date),
      price: parseFloat(price.toFixed(3)),
    });
  }
  
  return data;
};

// Format date to MM/DD format
const formatDate = (date: Date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export default PortfolioChart;
