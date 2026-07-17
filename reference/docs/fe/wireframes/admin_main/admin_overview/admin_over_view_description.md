Based on the provided image, here is a detailed description of the feature, its functions, target users, and how to use it.
Feature Overview: Admin Ordering Workflow Dashboard
This is a comprehensive Restaurant Management Dashboard (specifically focused on the Kitchen Display System (KDS) and Order Lifecycle). It provides a real-time view of all active tables, order statuses, kitchen workload, and urgency levels. The interface is designed to streamline the flow from order placement to payment.
1. Who Uses This Feature?
Kitchen Staff (Chefs/Cooks): To see what needs to be cooked, in what order, and track preparation progress.
Floor Managers/Supervisors: To monitor table turnover, identify bottlenecks (urgent orders), and manage staff assignments.
Waiters/Runners: To see which orders are "Ready" (Sẵn sàng) to be served and which tables need attention.
2. Key Functional Zones (How to Read the Screen)
The dashboard is divided into four main zones (A, B, C, D) plus a workflow guide at the bottom.
Zone A: High-Level Statistics (StatCards)
Function: Provides an instant snapshot of the restaurant's current health.
Data Points:
Bàn đang phục vụ (Tables Serving): Shows 5 active tables out of 6 total.
Món chờ làm (Items Waiting): 32 items pending in the queue.
Món đang làm (Items Cooking): 1 item currently being prepared.
Khẩn cấp / Cảnh báo (Urgent/Warning): A red box highlighting orders that have exceeded time limits (e.g., >20 minutes).
Zone B: Preparation Queue (Danh sách cần chuẩn bị)
Function: This is the primary workspace for the Kitchen. It lists orders that have been placed but not fully served.
Color Coding:
Blue (Đang làm): Currently cooking (e.g., Bàn 01).
Grey (Đang chờ): Waiting to be started (e.g., Bàn 02).
Green (Sẵn sàng): Ready to serve (e.g., Bàn 03).
Purple (Đã xác nhận - VIP): Confirmed orders, possibly for VIP guests (e.g., Bàn 05).
Details: Shows specific dishes (Bánh Cuốn Thịt, Nem Rán, Phở, etc.) and quantities.
Interaction: Users can click "Expand" to see details or use the dropdown menu to change status (e.g., move from "Cooking" to "Ready"). A popup is visible showing the option to mark an order as "Sẵn sàng" (Ready) or "Huỷ đơn" (Cancel).
Zone C: Active Serving (Đang phục vụ)
Function: Tracks orders currently at the table. This helps waiters know how much of an order has been served versus what is remaining.
Summary Header: "Tổng cần làm" (Total to make) aggregates all pending items across all active tables (e.g., 12 types of dishes, 33 portions left).
Table Breakdown:
Shows columns for Total (tổng), Served (ra), and Remaining (còn).
Red Table (Bàn 04): Indicates an urgent situation. The timer shows "30 phút" (30 mins), triggering the red "Urgent" border defined in the legend.
Purple Table (Bàn 05): A VIP table with a large order (535.000 đ).
Zone D: Empty Tables (Bàn trống)
Function: A visual map of available seating.
Details: Shows "Bàn VIP" (8 seats) is currently "Trống" (Empty). Other slots are greyed out, indicating they are occupied (referencing Zones B & C).
3. How to Use It (The Workflow)
The bottom section of the image ("Trạng thái hiện tại" - Current Status) defines the Standard Operating Procedure (SOP) for using the system.
Step-by-Step Lifecycle:
Đang chờ (Waiting):
Order is received.
Action: Kitchen clicks "Bắt đầu làm" (Start Cooking) to move it to the next stage. Or "Huỷ đơn" (Cancel) if there's an issue.
Đã xác nhận (Confirmed/VIP):
Special status for VIPs.
Action: Click "Bắt đầu làm" or "Huỷ đơn".
Đang làm (Cooking):
Kitchen is preparing the food.
Action: Once finished, click "Sẵn sàng" (Ready). If a mistake is made, click "Huỷ đơn".
Sẵn sàng (Ready):
Food is at the pass, waiting for a waiter.
Action: Waiter picks up food and clicks "Đã giao" (Delivered).
Đã giao (Delivered):
Food is at the customer's table.
Action: When the customer finishes, click "Thanh toán (POS)" to send to the Point of Sale system.
Đã huỷ (Cancelled):
The order is voided.
4. Urgency & Alerts
The system uses a time-based alert system (bottom left legend):
Red Border: Order elapsed > 20 minutes (Critical/Urgent).
Yellow Border: Order elapsed 10-20 minutes (Warning).
Orange Border: Order elapsed < 10 minutes (Normal).
Grey: No active order.
