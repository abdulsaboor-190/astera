// All sample content lives here so every screen tells the same Northwind story.
window.DATA = {
  kpis: [
    { id: "revenue", label: "Revenue", value: "$4.82M", delta: "+6.1%", pipelineId: "quarterly-sales" },
    { id: "orders", label: "Orders", value: "18.4 k", delta: "+3.2%", pipelineId: "orders-daily" },
    { id: "average-order-value", label: "Avg order value", value: "$262", delta: "-1.0%", pipelineId: "quarterly-sales" },
    { id: "target-attainment", label: "Target attainment", value: "94%", delta: "-4.0 pts", stale: true, pipelineId: "regional-targets" }
  ],

  // Q3 regional sales and targets are in thousands of dollars.
  regions: [
    { id: "north", name: "North", sales: 1350, target: 1200 },
    { id: "east", name: "East", sales: 1260, target: 1250 },
    { id: "south", name: "South", sales: 1130, target: 1300 },
    { id: "west", name: "West", sales: 1080, target: 1380 }
  ],

  monthly: [
    { month: "Apr", revenue: 1510 },
    { month: "May", revenue: 1580 },
    { month: "Jun", revenue: 1660 },
    { month: "Jul", revenue: 1590 },
    { month: "Aug", revenue: 1600 },
    { month: "Sep", revenue: 1630 }
  ],

  categories: [
    { name: "Home & Kitchen", revenue: 1180 },
    { name: "Electronics", revenue: 1040 },
    { name: "Clothing", revenue: 920 },
    { name: "Beauty & Care", revenue: 760 },
    { name: "Sports & Outdoors", revenue: 590 }
  ],

  // Pipeline owners and editors are fictional Northwind sample personas.
  pipelines: [
    {
      id: "quarterly-sales", name: "Quarterly Sales", status: "Succeeded", lastRun: "12 min ago", schedule: "Every day at 05:30", feeds: ["revenue", "average-order-value"],
      owner: "Amina Noor, Finance Ops", lastEditedBy: "Farhan Malik", lastEditedAt: "Today, 9:14 AM",
      steps: [
        { id: "sales-read", type: "read-excel", label: "Read Excel", plain: "Load the latest completed sales records from the workbook.", rowsIn: 0, rowsOut: 18400, status: "Succeeded", error: "", params: { file: "sales_q3.xlsx", rows: 18400 }, editable: ["file"] },
        { id: "sales-filter", type: "filter", label: "Filter rows", plain: "Keep orders placed during the third quarter.", rowsIn: 18400, rowsOut: 18400, status: "Succeeded", error: "", params: { quarter: "Q3" }, editable: ["quarter"] },
        { id: "sales-transform", type: "transform", label: "Transform", plain: "Add up sales and calculate the average order value.", rowsIn: 18400, rowsOut: 1, status: "Succeeded", error: "", params: { groupBy: "quarter", metrics: ["sum(sales)", "average(order_value)"] }, editable: ["groupBy"] },
        { id: "sales-publish", type: "publish", label: "Publish to dashboard", plain: "Refresh the Northwind sales dashboard cards.", rowsIn: 1, rowsOut: 1, status: "Succeeded", error: "", params: { dashboard: "Northwind overview" }, editable: [] }
      ]
    },
    {
      id: "regional-targets", name: "Regional Targets", status: "Failed", lastRun: "2 hours ago", schedule: "Every day at 05:00", feeds: ["target-attainment"],
      owner: "Sana Malik, Finance Ops", lastEditedBy: "Hamza Ali", lastEditedAt: "Yesterday, 5:40 PM",
      humanNote: "Hamza renamed “region_code” to “region_id” in Orders DB yesterday. This join still points to the old column.",
      steps: [
        { id: "targets-read", type: "read-excel", label: "Read Excel", plain: "Load the quarterly targets workbook.", rowsIn: 0, rowsOut: 4200, status: "Succeeded", error: "", params: { file: "targets_q3.xlsx", rows: 4200 }, editable: ["file"] },
        { id: "targets-filter", type: "filter", label: "Filter rows", plain: "Keep only target records for Q3.", rowsIn: 4200, rowsOut: 1050, status: "Succeeded", error: "", params: { field: "Quarter", value: "Q3" }, editable: ["value"] },
        { id: "targets-join", type: "join", label: "Join with database", plain: "Match each Q3 target to its sales region in Orders DB.", rowsIn: 1050, rowsOut: 0, status: "Failed", error: "Orders DB has no column named “region_code”. Check the current schema and update the join key before running this step again.", params: { source: "Orders DB", leftKey: "region_code", rightKey: "region_code", extraInputs: [{ type: "read-database", label: "Read database: Orders DB", rows: 18400 }] }, editable: ["leftKey", "rightKey"] },
        { id: "targets-transform", type: "transform", label: "Transform", plain: "Group joined records by region and add up sales.", rowsIn: 0, rowsOut: 0, status: "Skipped", error: "", params: { groupBy: "region", metric: "sum(sales)" }, editable: ["groupBy"] },
        { id: "targets-publish", type: "publish", label: "Publish to dashboard", plain: "Update the target attainment dashboard card.", rowsIn: 0, rowsOut: 0, status: "Skipped", error: "", params: { dashboard: "Northwind overview" }, editable: [] }
      ]
    },
    {
      id: "orders-daily", name: "Orders Daily", status: "Running", lastRun: "Started 3 min ago", schedule: "Every day at 04:45", feeds: ["orders"],
      owner: "Rida Khan, Data Ops", lastEditedBy: "Bilal Raza", lastEditedAt: "Today, 4:42 AM",
      steps: [
        { id: "orders-read", type: "read-database", label: "Read database", plain: "Fetch today's new order records.", rowsIn: 0, rowsOut: 620, status: "Succeeded", error: "", params: { database: "Orders DB", table: "orders", rows: 620 }, editable: ["table"] },
        { id: "orders-clean", type: "filter", label: "Filter valid orders", plain: "Remove cancelled and incomplete orders.", rowsIn: 620, rowsOut: 604, status: "Succeeded", error: "", params: { includeStatus: "complete" }, editable: ["includeStatus"] },
        { id: "orders-rollup", type: "transform", label: "Summarize orders", plain: "Count completed orders by day.", rowsIn: 604, rowsOut: 1, status: "Running", error: "", params: { groupBy: "day", metric: "count(order_id)" }, editable: ["groupBy"] },
        { id: "orders-publish", type: "publish", label: "Publish order count", plain: "Refresh the daily order KPI.", rowsIn: 0, rowsOut: 0, status: "Scheduled", error: "", params: { dashboard: "Northwind overview" }, editable: [] }
      ]
    },
    {
      id: "marketing-spend", name: "Marketing Spend", status: "Scheduled", lastRun: "Yesterday, 6:05 PM", schedule: "Tomorrow at 06:00", feeds: ["marketing-spend"],
      owner: "Eman Shah, Growth Ops", lastEditedBy: "Taimur Hussain", lastEditedAt: "Yesterday, 3:18 PM",
      steps: [
        { id: "marketing-read", type: "read-excel", label: "Read Excel", plain: "Load the latest campaign spend workbook.", rowsIn: 0, rowsOut: 840, status: "Scheduled", error: "", params: { file: "marketing_spend.xlsx", rows: 840 }, editable: ["file"] },
        { id: "marketing-filter", type: "filter", label: "Filter active campaigns", plain: "Keep campaigns that ran this quarter.", rowsIn: 840, rowsOut: 590, status: "Scheduled", error: "", params: { quarter: "Q3" }, editable: ["quarter"] },
        { id: "marketing-transform", type: "transform", label: "Summarize spend", plain: "Add spend by campaign channel.", rowsIn: 590, rowsOut: 8, status: "Scheduled", error: "", params: { groupBy: "channel", metric: "sum(spend)" }, editable: ["groupBy"] },
        { id: "marketing-publish", type: "publish", label: "Publish marketing view", plain: "Refresh the marketing dashboard chart.", rowsIn: 8, rowsOut: 8, status: "Scheduled", error: "", params: { dashboard: "Marketing overview" }, editable: [] }
      ]
    }
  ],

  // Filter values are precomputed for each range and region combination.
  // Revenue and target values are in thousands; KPI values are display-ready.
  filterData: {
    ranges: ["30d", "q3", "q2", "ytd"],
    regions: ["all", "north", "east", "south", "west"],
    values: {
      "30d": {
        all: { revenue: "$1.63M", revenueDelta: "+4.8%", orders: "6.2k", ordersDelta: "+2.5%", aov: "$263", aovDelta: "+1.1%", attainment: "94%", attainmentDelta: "-4.0 pts", sales: 1630, target: 1730 },
        north: { revenue: "$430K", revenueDelta: "+7.0%", orders: "1.6k", ordersDelta: "+4.0%", aov: "$269", aovDelta: "+2.8%", attainment: "113%", attainmentDelta: "+13 pts", sales: 430, target: 380 },
        east: { revenue: "$405K", revenueDelta: "+3.4%", orders: "1.5k", ordersDelta: "+2.0%", aov: "$270", aovDelta: "+1.4%", attainment: "101%", attainmentDelta: "+1 pt", sales: 405, target: 400 },
        south: { revenue: "$386K", revenueDelta: "+2.1%", orders: "1.5k", ordersDelta: "+1.0%", aov: "$257", aovDelta: "+1.1%", attainment: "87%", attainmentDelta: "-13 pts", sales: 386, target: 444 },
        west: { revenue: "$409K", revenueDelta: "+6.8%", orders: "1.6k", ordersDelta: "+3.2%", aov: "$256", aovDelta: "+3.5%", attainment: "78%", attainmentDelta: "-22 pts", sales: 409, target: 506 }
      },
      "q3": {
        all: { revenue: "$4.82M", revenueDelta: "+6.1%", orders: "18.4k", ordersDelta: "+3.2%", aov: "$262", aovDelta: "-1.0%", attainment: "94%", attainmentDelta: "-4.0 pts", sales: 4820, target: 5130 },
        north: { revenue: "$1.35M", revenueDelta: "+8.2%", orders: "5.1k", ordersDelta: "+5.0%", aov: "$265", aovDelta: "+3.0%", attainment: "113%", attainmentDelta: "+13 pts", sales: 1350, target: 1200 },
        east: { revenue: "$1.26M", revenueDelta: "+5.4%", orders: "4.8k", ordersDelta: "+4.1%", aov: "$263", aovDelta: "+1.2%", attainment: "101%", attainmentDelta: "+1 pt", sales: 1260, target: 1250 },
        south: { revenue: "$1.13M", revenueDelta: "+2.1%", orders: "4.3k", ordersDelta: "+1.4%", aov: "$263", aovDelta: "-0.7%", attainment: "87%", attainmentDelta: "-13 pts", sales: 1130, target: 1300 },
        west: { revenue: "$1.08M", revenueDelta: "+3.8%", orders: "4.2k", ordersDelta: "+2.0%", aov: "$257", aovDelta: "-1.3%", attainment: "78%", attainmentDelta: "-22 pts", sales: 1080, target: 1380 }
      },
      "q2": {
        all: { revenue: "$4.55M", revenueDelta: "+4.3%", orders: "17.8k", ordersDelta: "+2.7%", aov: "$256", aovDelta: "+1.6%", attainment: "97%", attainmentDelta: "-1.0 pts", sales: 4550, target: 4690 },
        north: { revenue: "$1.22M", revenueDelta: "+6.4%", orders: "4.8k", ordersDelta: "+3.8%", aov: "$254", aovDelta: "+2.5%", attainment: "108%", attainmentDelta: "+8 pts", sales: 1220, target: 1130 },
        east: { revenue: "$1.18M", revenueDelta: "+4.7%", orders: "4.6k", ordersDelta: "+2.9%", aov: "$257", aovDelta: "+1.8%", attainment: "99%", attainmentDelta: "-1 pt", sales: 1180, target: 1190 },
        south: { revenue: "$1.10M", revenueDelta: "+2.8%", orders: "4.3k", ordersDelta: "+1.6%", aov: "$256", aovDelta: "+1.2%", attainment: "92%", attainmentDelta: "-8 pts", sales: 1100, target: 1200 },
        west: { revenue: "$1.05M", revenueDelta: "+3.1%", orders: "4.1k", ordersDelta: "+2.3%", aov: "$256", aovDelta: "+0.8%", attainment: "91%", attainmentDelta: "-9 pts", sales: 1050, target: 1150 }
      },
      "ytd": {
        all: { revenue: "$13.92M", revenueDelta: "+5.4%", orders: "53.7k", ordersDelta: "+3.0%", aov: "$259", aovDelta: "-0.2%", attainment: "95%", attainmentDelta: "-3.0 pts", sales: 13920, target: 14640 },
        north: { revenue: "$3.92M", revenueDelta: "+7.7%", orders: "14.8k", ordersDelta: "+4.6%", aov: "$265", aovDelta: "+2.4%", attainment: "111%", attainmentDelta: "+11 pts", sales: 3920, target: 3530 },
        east: { revenue: "$3.72M", revenueDelta: "+5.0%", orders: "14.1k", ordersDelta: "+3.7%", aov: "$264", aovDelta: "+1.0%", attainment: "100%", attainmentDelta: "0 pts", sales: 3720, target: 3710 },
        south: { revenue: "$3.24M", revenueDelta: "+2.4%", orders: "12.5k", ordersDelta: "+1.3%", aov: "$259", aovDelta: "-0.5%", attainment: "89%", attainmentDelta: "-11 pts", sales: 3240, target: 3640 },
        west: { revenue: "$3.04M", revenueDelta: "+3.5%", orders: "12.3k", ordersDelta: "+2.1%", aov: "$247", aovDelta: "-1.0%", attainment: "81%", attainmentDelta: "-19 pts", sales: 3040, target: 3760 }
      }
    },
    // Chart series are also cached by filter so charts never calculate aggregates.
    charts: {
      monthly: {
        "30d": {
          all: { labels: ["Sep"], values: [1630] }, north: { labels: ["Sep"], values: [430] },
          east: { labels: ["Sep"], values: [405] }, south: { labels: ["Sep"], values: [386] }, west: { labels: ["Sep"], values: [409] }
        },
        q3: {
          all: { labels: ["Jul", "Aug", "Sep"], values: [1590, 1600, 1630] },
          north: { labels: ["Jul", "Aug", "Sep"], values: [440, 450, 460] },
          east: { labels: ["Jul", "Aug", "Sep"], values: [410, 420, 430] },
          south: { labels: ["Jul", "Aug", "Sep"], values: [370, 380, 380] },
          west: { labels: ["Jul", "Aug", "Sep"], values: [350, 360, 370] }
        },
        q2: {
          all: { labels: ["Apr", "May", "Jun"], values: [1450, 1500, 1600] },
          north: { labels: ["Apr", "May", "Jun"], values: [390, 400, 430] },
          east: { labels: ["Apr", "May", "Jun"], values: [380, 390, 410] },
          south: { labels: ["Apr", "May", "Jun"], values: [350, 360, 390] },
          west: { labels: ["Apr", "May", "Jun"], values: [330, 350, 370] }
        },
        ytd: {
          all: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [2210, 2255, 2290, 2325, 2380, 2460] },
          north: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [620, 640, 650, 660, 670, 680] },
          east: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [590, 600, 610, 620, 640, 660] },
          south: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [520, 525, 530, 535, 550, 580] },
          west: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [480, 490, 500, 510, 520, 540] }
        }
      },
      categories: {
        "30d": {
          all: [390, 350, 310, 290, 280], north: [105, 95, 80, 75, 60], east: [100, 90, 80, 70, 65], south: [95, 82, 75, 70, 64], west: [100, 90, 75, 72, 65]
        },
        q3: {
          all: [1180, 1040, 920, 760, 590], north: [350, 290, 260, 210, 170], east: [320, 280, 240, 200, 160], south: [290, 250, 210, 180, 140], west: [280, 240, 200, 170, 130]
        },
        q2: {
          all: [1120, 980, 880, 730, 560], north: [310, 270, 230, 200, 160], east: [300, 260, 220, 190, 150], south: [280, 240, 210, 180, 140], west: [270, 230, 200, 170, 130]
        },
        ytd: {
          all: [3290, 2840, 2500, 2040, 1580], north: [1000, 850, 750, 650, 500], east: [950, 820, 700, 620, 500], south: [820, 700, 620, 550, 450], west: [780, 660, 590, 530, 430]
        }
      }
    }
  },

  drillDown: {
    north: { monthly: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [420, 438, 455, 447, 468, 479] }, stores: [
      { name: "Seattle Downtown", sales: 420, target: 390, attainment: "108%" }, { name: "Portland Pearl", sales: 365, target: 350, attainment: "104%" }, { name: "Boise Market", sales: 310, target: 300, attainment: "103%" }, { name: "Spokane North", sales: 255, target: 260, attainment: "98%" }
    ] },
    east: { monthly: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [398, 410, 426, 419, 438, 446] }, stores: [
      { name: "Boston Harbor", sales: 390, target: 380, attainment: "103%" }, { name: "New York Midtown", sales: 365, target: 370, attainment: "99%" }, { name: "Philadelphia Center", sales: 285, target: 280, attainment: "102%" }, { name: "Baltimore Inner Harbor", sales: 220, target: 220, attainment: "100%" }
    ] },
    south: { monthly: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [352, 369, 381, 372, 390, 401] }, stores: [
      { name: "Atlanta Peachtree", sales: 340, target: 390, attainment: "87%" }, { name: "Miami Bayside", sales: 305, target: 350, attainment: "87%" }, { name: "Dallas Uptown", sales: 275, target: 320, attainment: "86%" }, { name: "Nashville Central", sales: 210, target: 240, attainment: "88%" }
    ] },
    west: { monthly: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [330, 345, 358, 350, 369, 377] }, stores: [
      { name: "Los Angeles West", sales: 305, target: 390, attainment: "78%" }, { name: "San Diego Harbor", sales: 280, target: 360, attainment: "78%" }, { name: "Phoenix Central", sales: 265, target: 340, attainment: "78%" }, { name: "San Francisco Market", sales: 230, target: 290, attainment: "79%" }
    ] }
  },

  chatAnswers: [
    {
      keywords: ["missed target", "miss target", "regions missed", "below target", "target attainment"],
      question: "Which regions missed their Q3 target?",
      summary: "South finished Q3 at 87% of target; West reached 78%. North and East met target. Regional Targets failed at the Orders DB join 2 hours ago, so this result is stale.",
      chartType: "bar", pipelineId: "regional-targets",
      chartData: { labels: ["North", "East", "South", "West"], sales: [1350, 1260, 1130, 1080], target: [1200, 1250, 1300, 1380] }
    },
    {
      keywords: ["monthly revenue", "revenue last", "revenue trend", "six months", "6 months"],
      question: "How has monthly revenue changed over the last 6 months?",
      summary: "Monthly revenue rose from $1.51 M in April to $1.63 M in September, with a small dip in July. Q3 revenue finished at $4.82 M, up 6.1% year over year.",
      chartType: "line", pipelineId: "quarterly-sales",
      chartData: { labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], values: [1510, 1580, 1660, 1590, 1600, 1630] }
    },
    {
      keywords: ["top categories", "top 5 categories", "product categories", "category revenue", "best categories"],
      question: "What are the top 5 product categories by revenue?",
      summary: "Home & Kitchen led at $1.18 M, followed by Electronics at $1.04 M and Clothing at $920 K. Sports & Outdoors completed the top five at $590 K.",
      chartType: "horizontal-bar", pipelineId: "quarterly-sales",
      chartData: { labels: ["Home & Kitchen", "Electronics", "Clothing", "Beauty & Care", "Sports & Outdoors"], values: [1180, 1040, 920, 760, 590] }
    }
  ]
};
