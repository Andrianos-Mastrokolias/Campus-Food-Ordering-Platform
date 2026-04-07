# Acceptance Tests
## User Story 1: Third-Party Login

### UAT 1
Given I am a new user
When I choose a third-party identity provider and complete sign up
Then my account should be created and I should be logged into the platform

### UAT 2
Given I am an existing user
When I log in using a third-party identity provider
Then I should be granted access to the platform according to my role

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

### UAT 1
Given I am logged in as a student
When I select items from one or more vendors and place an order
Then the order should be successfully recorded in the system

### UAT 2
Given I have placed an order
When the order is submitted
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
