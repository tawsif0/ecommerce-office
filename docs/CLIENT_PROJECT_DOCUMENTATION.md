# Client Project Documentation

## 1. Executive Summary

This project is a MERN-based ecommerce marketplace designed for Bangladesh-focused online commerce operations. It supports both single-vendor and multi-vendor business models, buyer-facing shopping flows, seller operations, and centralized admin control over catalog, inventory, content, promotions, and storefront configuration.

The system is not only a public shopping website. It is a connected commerce platform with:

- public storefront pages
- buyer account tools
- vendor operations
- admin and super admin dashboards
- inventory and order control
- coupon and campaign management
- storefront content control
- reporting and support workflows

## 2. Project Positioning

This ecommerce system is built to serve businesses that want:

- a modern storefront experience
- role-based operations for different teams
- optional multi-vendor expansion
- Bangladesh-ready delivery and payment workflows
- centralized control over branding and website behavior

## 3. Business Modes

### Single Vendor Mode

- Vendor registration is automatically disabled
- Marketplace-only vendor modules are hidden where required
- The business operates as one controlled seller experience

### Multi Vendor Mode

- Vendor registration can be enabled or disabled
- Vendor operations, approvals, reports, and payout modules are available
- The platform supports marketplace-style seller participation

## 4. User Roles and Responsibilities

| Role | Core Responsibility |
| --- | --- |
| Super Admin | Full system ownership and top-level governance |
| Admin | Daily commerce, website, and operational management |
| Vendor | Product, inventory, order, and store-level seller management |
| Staff | Service and operational support modules |
| Customer/User | Shopping, checkout, tracking, addresses, wishlist, support |

### Super Admin

Super Admin is the highest control role.

Main capabilities:

- full access to ecommerce controls
- website setup and system configuration
- admin user management
- top-level marketplace controls
- super-admin-only control screens
- oversight of reports, operations, and roles

### Admin

Main capabilities:

- order management
- add order
- shipping zones
- payment methods
- coupon management
- customer management
- product and category management
- banner and storefront management
- inventory center
- suppliers, purchases, and accounts
- campaign, landing, and website setup
- reports and customer-risk views
- marketplace moderation in multi-vendor mode

### Vendor

Main capabilities:

- create and modify products
- bulk upload products
- inventory management
- order handling
- vendor shipping
- coupons
- store profile and store settings
- campaigns and ads
- sales reporting and support features

### Staff

Main capabilities:

- support tickets
- vendor/customer messages
- campaign and landing support
- report support
- selected service and operations modules

### Customer / User

Main capabilities:

- browse products and categories
- add to cart and checkout
- guest or logged-in purchase flow
- saved addresses
- orders and order tracking
- wishlist
- compare products
- support interaction

## 5. Public Website Structure

### Homepage

The homepage includes:

- hero slider
- sponsored ad section
- marketplace-style post-slider discovery panels
- category-led product discovery
- daily deals
- category floors
- new arrivals
- recently viewed section

### Shop Page

The shop page includes:

- grid view and list view
- category filtering
- category type filtering
- price filtering
- sort options
- search-aware browsing
- deal and new-arrival collection views
- compare product action

### Product Details

Each product details page supports:

- gallery/media display
- pricing display by pricing type
- seller or vendor information
- stock visibility based on public-stock settings
- TBA behavior when product is not purchasable
- compare support

### Cart and Checkout

Current commerce flow includes:

- cart management
- coupon application
- guest checkout
- logged-in checkout
- address support
- payment method selection
- cash on delivery support
- thank-you page
- order tracking page

### Additional Buyer Experience Features

- wishlist
- saved addresses
- compare page
- recently viewed products
- vendor storefront page
- FAQ and policy pages
- contact page

## 6. Catalog and Product Model

### Product Types

The system supports:

- simple products
- variable products
- category-linked products
- brand-linked products
- seller-linked products in marketplace mode

### Pricing Types

Products support three pricing modes:

#### Single Price

- one direct price
- shown normally in catalog and product details

#### Best Price

- previous price + new price
- supports discount presentation

#### TBA

- product shows `TBA`
- add-to-cart and purchase actions are blocked

### Additional Product Features

- color options
- custom colors
- dimensions
- stock control
- optional public stock display
- bulk product upload

## 7. Inventory and Stock Visibility

The inventory model supports both operational stock control and controlled public visibility.

Key behavior:

- stock is managed from product and inventory modules
- admins and vendors can manage stock internally
- public stock quantity is only shown when enabled at product level
- public stock summary can be controlled separately from website settings
- the storefront can show high-level product or stock summary when enabled
- stock behavior is connected to order and purchasing flows

## 8. Storefront and Brand Control

The Website Setup module controls public presentation and brand settings.

Configurable areas include:

- store name
- tagline
- text logo or uploaded logo
- brand color
- font family
- marketplace mode
- vendor registration availability
- public stock summary availability
- contact details
- address and map links
- social links
- landing section labels
- quick links
- footer caption
- integrations
- courier settings
- invoice settings
- city and district options

The website is wired so many storefront changes can flow through the current Redux-based public settings path instead of relying on manual refresh workflows.

## 9. Marketing, Campaign, and Content Modules

The project includes marketing and storefront-growth capabilities:

- hero slider / banner management
- campaign offers
- landing pages
- ads
- coupon management
- quick storefront section control

This allows the business to manage both normal catalog browsing and promotion-focused selling flows.

## 10. Commerce Operations Modules

The system includes these operational areas:

- orders
- customers
- payment methods
- shipping zones
- coupons
- products
- categories
- brands
- inventory center
- suppliers
- purchases
- accounts
- banners
- website setup
- landing pages
- campaigns
- ads
- business reports
- product reports
- vendor reports
- customer risk
- support tickets
- abandoned order monitoring

## 11. Marketplace and Seller Modules

When multi-vendor mode is active, the platform supports:

- vendor registration control
- vendor dashboards
- vendor store settings
- vendor product management
- vendor inventory
- vendor messages
- vendor orders
- vendor shipping
- vendor reports
- vendor review moderation
- vendor payouts
- product approvals

## 12. Advanced Modules

The system also includes advanced modules for extended business use:

- subscriptions
- bookings
- auctions
- staff roles
- verifications
- geolocation
- support ticket operations
- voice assistant

## 13. Customer Support and Service Tools

The support layer includes:

- support ticket module
- vendor/customer messaging
- FAQ page
- policy pages
- contact page
- order tracking
- customer risk review for operations

## 14. Voice Assistant

The project includes an admin-side voice assistant path designed for guided dashboard actions.

Current intended use:

- admin and super admin usage
- dashboard navigation support
- command planning support
- operational assistance inside management workflows

This feature is meant to support admin workflow efficiency, not to replace approval-heavy manual review for sensitive business actions.

## 15. Dashboard Structure by Role

### Super Admin / Admin Dashboard

Main grouped areas:

- overview
- commerce
- catalog and inventory
- marketplace
- growth and marketing
- reports and insights
- operations
- brand and storefront
- administration
- advanced modules
- account controls

### Vendor Dashboard

Main grouped areas:

- overview
- commerce
- catalog and inventory
- growth and marketing
- operations and reports
- storefront
- advanced modules
- account controls

### Staff Dashboard

Main grouped areas:

- overview
- service desk
- advanced modules
- account controls

### Customer Dashboard

Main grouped areas:

- overview
- orders and lists
- services
- support
- account controls

## 16. Buyer Journey

The implemented buyer journey is:

1. Land on homepage
2. Browse categories, deals, and product floors
3. Enter shop or open product details
4. Add to cart if purchasable
5. Apply coupon if available
6. Checkout as guest or logged-in user
7. Select address and payment method
8. Complete order
9. View thank-you page
10. Track order later from tracking page

## 17. Seller Journey

In multi-vendor operation, the seller journey is:

1. Vendor access is enabled by website settings
2. Vendor account enters vendor dashboard
3. Vendor creates or uploads products
4. Vendor manages stock and product visibility
5. Vendor receives orders and shipping tasks
6. Vendor monitors campaigns, reports, and store settings

## 18. Admin Journey

The admin operational journey is:

1. Configure website and storefront
2. Manage catalog and category structure
3. Control coupons, payment methods, and shipping
4. Manage orders and customers
5. Control inventory, suppliers, and purchases
6. Moderate vendor and marketplace workflows
7. Analyze reports and buyer risks
8. Update campaigns, ads, and landing content

## 19. Bangladesh Commerce Readiness

The project is aligned to Bangladesh-focused ecommerce usage through:

- local address and district handling support
- cash on delivery support
- courier integration configuration fields
- marketplace presentation designed for Bangladesh commerce operations
- admin-controlled public messaging suitable for local market positioning

## 20. Technical Stack

- `Frontend`: React + Vite + Redux Toolkit + Tailwind CSS + Framer Motion
- `Backend`: Node.js + Express
- `Database`: MongoDB + Mongoose
- `State Management`: Redux Toolkit for shared website/public settings and application state
- `Media`: uploaded assets and hosted image usage

## 21. Delivery Scope Notes

The current delivered scope intentionally excludes the following removed business features:

- affiliation / affiliate marketing
- network marketing logic
- referral logic
- activation logic
- wallet balance flows
- withdraw flows
- forced auto-generated ID business flow previously removed

These were intentionally removed from the project and are not part of the active delivered ecommerce scope.

## 22. Client Handover Checklist

Before final handover, confirm:

1. final domain is connected
2. production environment variables are configured
3. final logo and storefront copy are set
4. payment methods are finalized
5. courier details are finalized
6. admin and super admin credentials are prepared securely
7. sample categories and products are loaded
8. coupons and shipping rules are reviewed
9. analytics and tracking IDs are added if required
10. policy content is finalized

## 23. Deliverables To Provide Client

- live website URL
- admin panel URL
- super admin access handover
- role summary
- feature summary
- support or maintenance note
- content update responsibility note

## 24. Recommended Presentation Format

For client presentation, this document can be used as:

- proposal attachment
- delivery handover document
- project feature summary
- onboarding document for business stakeholders

## 25. Final Note

This document mirrors the implemented project structure and active business scope in the current codebase. It should be customized with the client's final brand name, live domain, and support arrangement before formal delivery.
