# Acceptance Tests
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
