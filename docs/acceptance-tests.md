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
##1. Student tracks order status
###Acceptance Test 1.1

Given a student has placed an order
When the student views their order history or active orders
Then the system must display the current order status

###Acceptance Test 1.2

Given an order has just been placed
When the student checks the order
Then the status must show as Pending

###Acceptance Test 1.3

Given the vendor has started working on the order
When the vendor updates the status
Then the student must see the status as Being Prepared

###Acceptance Test 1.4

Given the vendor has finished preparing the order
When the vendor updates the status to ready
Then the student must see the status as Ready

###Acceptance Test 1.5

Given the order has been collected or completed
When the status is updated
Then the student must see the status as Completed

##2. Vendor views all orders for their shop
###Acceptance Test 2.1

Given a vendor is logged into the vendor dashboard
When the vendor opens the orders page
Then the system must display all orders linked to that vendor’s shop

###Acceptance Test 2.2

Given there are multiple orders placed for the vendor’s shop
When the vendor views incoming orders
Then each order must show relevant details such as order items, customer, and current status

###Acceptance Test 2.3

Given a vendor is viewing an order
When the vendor updates the order status
Then the updated status must be saved in the system

###Acceptance Test 2.4

Given a vendor is logged in
When the vendor views orders
Then the vendor must not see orders belonging to another vendor

##3. Menu items automatically show sold out at stock 0
###Acceptance Test 3.1

Given a menu item has stock greater than 0
When students view the menu
Then the item must be shown as available

###Acceptance Test 3.2

Given a menu item’s stock reaches 0
When the menu is refreshed or reloaded
Then the item must be marked as Sold Out

###Acceptance Test 3.3

Given a menu item is marked as sold out
When a student attempts to place an order containing that item
Then the system must prevent the order from being placed

###Acceptance Test 3.4

Given a vendor increases the stock of a sold out item above 0
When the menu updates
Then the item must no longer display as sold out

##4. Vendor registration and verification request
###Acceptance Test 4.1

Given a student wants to become a vendor
When the student opens the vendor registration form
Then the system must allow them to submit business details

###Acceptance Test 4.2

Given a student submits the vendor registration form
When the submission is successful
Then the system must create a vendor application with status Pending

###Acceptance Test 4.3

Given a vendor application is still pending
When the applicant tries to access the vendor dashboard
Then the system must deny access

###Acceptance Test 4.4

Given a vendor application has been approved
When the applicant logs in
Then the system must allow access to the vendor dashboard

###Acceptance Test 4.5

Given a user already has a pending vendor request
When they try to submit another vendor application
Then the system must prevent a duplicate pending request

##5A. Admin sees vendor shop details before approval
###Acceptance Test 5A.1

Given an admin is logged in
When the admin opens the vendor applications page
Then the system must display submitted vendor applications

###Acceptance Test 5A.2

Given a vendor application exists
When the admin selects that application
Then the system must display the vendor’s shop details

###Acceptance Test 5A.3

Given the admin is viewing a vendor application
When the admin reviews the details
Then the system must show information such as business name, description, phone, address, and applicant identity

###Acceptance Test 5A.4

Given the admin has reviewed the vendor details
When the admin chooses approve or reject
Then the system must save the review decision

##5B. Shop number generation on vendor approval
###Acceptance Test 5B.1

Given a vendor application is pending
When the admin approves the application
Then the system must generate a unique shop number

###Acceptance Test 5B.2

Given a vendor application has been approved
When the approval is processed
Then the generated shop number must be stored in the vendor application record

###Acceptance Test 5B.3

Given a vendor application has been approved
When the user record is updated
Then the generated shop number must also be stored in the approved vendor’s profile

###Acceptance Test 5B.4

Given two different vendors are approved
When shop numbers are generated
Then each vendor must receive a different unique shop number

##6. Orders linked to the correct vendor and tracked through the system
###Acceptance Test 6.1

Given a student places an order from a specific vendor
When the order is saved
Then the order must be linked to that vendor in the system

###Acceptance Test 6.2

Given an order is linked to a vendor
When the vendor views their order dashboard
Then that order must appear only for the correct vendor

###Acceptance Test 6.3

Given a student has placed an order
When the student views their order status
Then the order must show the correct vendor and current tracking status

###Acceptance Test 6.4

Given multiple vendors exist on the platform
When orders are placed at different shops
Then each order must remain associated with the correct vendor throughout the workflow
