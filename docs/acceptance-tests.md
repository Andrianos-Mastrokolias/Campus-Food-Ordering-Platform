# Acceptance Tests
# Sprint 1
## User Story 1: Third-Party Login

### UAT 1
Given I am a new user
When I sign in with Google
Then my user account should be created in Firestore and I should be logged into the platform

### UAT 2
Given I am an existing user
When I log in with google
Then I should be logged into the platform and redirected according to my role

### UAT 3
Given I am logged in as a user with a specific role
When I attempt to access a page that is not permitted for my role
Then I should be redirected to the unauthorized page

---

## User Story 2: Vendor Menu Management

### UAT 1
Given I am logged in as a vendor
When I create a menu item with a name, price, description, photo, and availability
Then the item should appear on my menu for students to view

### UAT 2
Given I am logged in as a vendor and I already have a menu item
When I edit the item details
Then the updated details should be displayed to students

### UAT 3
Given I am logged in as a vendor
When I mark an item as sold out
Then students should see that the item is unavailable

---

## User Story 3: Admin Access Request

### UAT 1
Given I am logged in as a normal user
When I submit a request for admin access
Then the request should be recorded for an existing admin to review

### UAT 2
Given I have submitted an admin access request
When an existing admin approves my request
Then my role should be updated to admin

---
## User Story 4: Student Order Placement

### UAT 1 — Add Item to Cart
Given I am logged in as a student
When I select items from one or more vendors
Then the selected items should appear in my cart

### UAT 2 — Remove Item from Cart
Given items exist in my cart
When I remove an item
Then the item should be removed from the cart

### UAT 3 — Checkout Order
Given I have items in my cart
When I click checkout
Then the cart should be cleared and the order should be created

### UAT 4 — Order Confirmation
Given I have placed an order
When the order is successfully submitted
Then I should receive confirmation that my order was received

---

## User Story 5: Approve or Suspend Vendor Accounts

### UAT 1
Given I am logged in as an admin and a vendor account is pending
When I approve the vendor account
Then the vendor's status should change to approved

### UAT 2
Given I am logged in as an admin and a vendor account is approved
When I suspend the vendor account
Then the vendor's status should change to suspended

### UAT 3
Given I am not an admin
When I try to access vendor approval or suspension actions
Then I should be denied access

# Sprint 2


## 1. Student tracks order status

### AT1.1 – View order status
**Given** a student has placed an order  
**When** the student views their orders  
**Then** the system displays the current order status  

### AT1.2 – Initial order status
**Given** an order has just been placed  
**When** the student checks the order  
**Then** the status is **Pending**  

### AT1.3 – Order in preparation
**Given** the vendor has started preparing the order  
**When** the status is updated  
**Then** the student sees **Being Prepared**  

### AT1.4 – Order ready
**Given** the order is finished  
**When** the vendor marks it as ready  
**Then** the student sees **Ready**  

### AT1.5 – Order completed
**Given** the order has been collected  
**When** the status is updated  
**Then** the student sees **Completed**  

---

## 2. Vendor views and manages orders

### AT2.1 – View vendor orders
**Given** a vendor is logged in  
**When** the vendor views the orders page  
**Then** all orders for their shop are displayed  

### AT2.2 – Order details visible
**Given** orders exist  
**When** the vendor views them  
**Then** order details (items, user, status) are shown  

### AT2.3 – Update order status
**Given** a vendor selects an order  
**When** the vendor updates the status  
**Then** the system saves the updated status  

### AT2.4 – Vendor isolation
**Given** multiple vendors exist  
**When** a vendor views orders  
**Then** only their own shop’s orders are shown  

---

## 3. Menu items show as sold out

### AT3.1 – Item available
**Given** an item has stock > 0  
**When** students view the menu  
**Then** the item is available  

### AT3.2 – Item sold out
**Given** an item’s stock reaches 0  
**When** the menu updates  
**Then** the item is marked **Sold Out**  

### AT3.3 – Prevent ordering sold-out items
**Given** an item is sold out  
**When** a student attempts to order it  
**Then** the system blocks the order  

### AT3.4 – Restock item
**Given** stock is increased above 0  
**When** the menu updates  
**Then** the item becomes available again  

---

## 4. Vendor registration and verification

### AT4.1 – Submit vendor application
**Given** a user wants to become a vendor  
**When** they submit the registration form  
**Then** a vendor application is created  

### AT4.2 – Application status pending
**Given** a vendor application is submitted  
**When** it is stored  
**Then** its status is **Pending**  

### AT4.3 – Restrict access before approval
**Given** a vendor is not approved  
**When** they try to access the vendor dashboard  
**Then** access is denied  

### AT4.4 – Allow access after approval
**Given** a vendor is approved  
**When** they log in  
**Then** they can access the vendor dashboard  

### AT4.5 – Prevent duplicate applications
**Given** a user already has a pending request  
**When** they submit another application  
**Then** the system rejects it  

---

## 5A. Admin reviews vendor applications

### AT5A.1 – View applications
**Given** an admin is logged in  
**When** they open vendor applications  
**Then** all applications are displayed  

### AT5A.2 – View vendor details
**Given** an application exists  
**When** the admin selects it  
**Then** full shop details are shown  

### AT5A.3 – Verify business information
**Given** the admin is reviewing an application  
**When** viewing details  
**Then** business name, description, phone, and address are visible  

### AT5A.4 – Approve or reject
**Given** the admin reviews an application  
**When** they make a decision  
**Then** the system saves the result  

---

## 5B. Shop number generation

### AT5B.1 – Generate shop number
**Given** a vendor application is approved  
**When** approval occurs  
**Then** a unique shop number is generated  

### AT5B.2 – Store shop number in application
**Given** a vendor is approved  
**When** the system updates the record  
**Then** the shop number is saved in the application  

### AT5B.3 – Store shop number in user profile
**Given** a vendor is approved  
**When** the user record is updated  
**Then** the shop number is stored in the vendor profile  

### AT5B.4 – Ensure uniqueness
**Given** multiple vendors are approved  
**When** shop numbers are generated  
**Then** each shop number is unique  

---

## 6. Orders linked to correct vendor

### AT6.1 – Link order to vendor
**Given** a student places an order  
**When** the order is saved  
**Then** it is linked to the correct vendor  

### AT6.2 – Vendor sees correct orders
**Given** an order exists  
**When** the vendor views their orders  
**Then** only their orders are shown  

### AT6.3 – Student sees correct vendor
**Given** a student views an order  
**When** the order is displayed  
**Then** it shows the correct vendor and status  

### AT6.4 – Maintain correct association
**Given** multiple vendors exist  
**When** orders are processed  
**Then** each order remains linked to the correct vendor  

---
