const express = require("express");
const auth = require("../middlewares/auth");
const {
  getPublicPlans,
  getAdminPlans,
  createPlan,
  updatePlan,
  deletePlan,
  subscribeToPlan,
  getMySubscription,
  getAdminSubscriptions,
  updateSubscriptionStatus,
  getMyRecurringSubscriptions,
  getVendorRecurringSubscriptions,
  getAdminRecurringSubscriptions,
  updateRecurringSubscriptionStatus,
  runRecurringRenewalCycle,
} = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/public/plans", getPublicPlans);

router.get("/plans", auth, getAdminPlans);
router.post("/plans", auth, createPlan);
router.put("/plans/:id", auth, updatePlan);
router.delete("/plans/:id", auth, deletePlan);

router.post("/me/subscribe", auth, subscribeToPlan);
router.get("/me", auth, getMySubscription);

router.get("/admin/subscriptions", auth, getAdminSubscriptions);
router.patch("/admin/subscriptions/:id/status", auth, updateSubscriptionStatus);

router.get("/recurring/me", auth, getMyRecurringSubscriptions);
router.get("/recurring/vendor", auth, getVendorRecurringSubscriptions);
router.get("/recurring/admin", auth, getAdminRecurringSubscriptions);
router.patch("/recurring/:id/status", auth, updateRecurringSubscriptionStatus);
router.post("/recurring/admin/process", auth, runRecurringRenewalCycle);

module.exports = router;
