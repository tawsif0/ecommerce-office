import React from "react";
import { FaFire, FaShoppingBag } from "react-icons/fa";
import { FaBolt, FaLayerGroup, FaRocket } from "react-icons/fa6";
import Banner from "./Banner";
import BrandLogoMarquee from "../components/BrandLogoMarquee";
import ProductShowcaseSection from "../components/ProductShowcaseSection";

const EcomArcHome = () => {
  return (
    <>
      <Banner />
      <BrandLogoMarquee />
      <ProductShowcaseSection
        sectionId="top-categories"
        productType="Popular"
        eyebrow="Trending Now"
        title="Popular Products"
        description="Discover the products shoppers are opening, saving, and buying most across the storefront."
        icon={FaFire}
        iconShellClassName="bg-black"
        eyebrowClassName="text-gray-600"
        activeTabClassName="bg-black text-white shadow-md"
        inactiveTabClassName="bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
        buttonClassName="bg-black text-white hover:bg-gray-900"
        badgeText="Trending"
        badgeClassName="bg-black text-white"
        viewAllNoun="Popular Products"
        sectionClassName="bg-white py-10 md:py-14"
      />
      <ProductShowcaseSection
        productType="Hot deals"
        eyebrow="Limited Time Offers"
        title="Hot Deals"
        description="A tighter promotional shelf inspired by the reference storefront, with one consistent product card design."
        icon={FaBolt}
        iconShellClassName="bg-linear-to-r from-red-600 to-orange-500"
        eyebrowClassName="text-red-600"
        activeTabClassName="bg-linear-to-r from-red-600 to-orange-500 text-white shadow-lg"
        inactiveTabClassName="bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
        buttonClassName="bg-linear-to-r from-red-600 to-orange-500 text-white hover:from-red-700 hover:to-orange-600"
        badgeText="Hot Deal"
        badgeClassName="bg-linear-to-r from-red-600 to-orange-500 text-white"
        viewAllNoun="Hot Deals"
        sectionClassName="bg-slate-50 py-10 md:py-14"
      />
      <ProductShowcaseSection
        productType="General"
        eyebrow="Featured Collections"
        title="Featured Products"
        description="Core catalog picks now sit in the same ecom-arc-inspired flow while keeping your office product cards and live backend wiring."
        icon={FaShoppingBag}
        iconShellClassName="bg-black"
        eyebrowClassName="text-gray-600"
        activeTabClassName="bg-black text-white shadow-md"
        inactiveTabClassName="bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
        buttonClassName="bg-black text-white hover:bg-gray-900"
        viewAllNoun="Products"
        sectionClassName="bg-white py-10 md:py-14"
        fallbackEndpointPath="/products/public"
      />
      <ProductShowcaseSection
        productType="Best Selling"
        eyebrow="Hot Sellers"
        title="Best Selling Products"
        description="Keep high-intent products visible in the same visual system so the homepage feels consistent section to section."
        icon={FaLayerGroup}
        iconShellClassName="bg-gray-700"
        eyebrowClassName="text-gray-600"
        activeTabClassName="bg-gray-700 text-white shadow-md"
        inactiveTabClassName="bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
        buttonClassName="bg-gray-700 text-white hover:bg-gray-800"
        badgeText="Best Seller"
        badgeClassName="bg-gray-700 text-white"
        viewAllNoun="Best Sellers"
        sectionClassName="bg-slate-50 py-10 md:py-14"
      />
      <ProductShowcaseSection
        productType="Latest"
        eyebrow="New Arrivals"
        title="Latest Products"
        description="Fresh arrivals stay in the same card system, matching the reference layout while preserving your current data wiring."
        icon={FaRocket}
        iconShellClassName="bg-blue-600"
        eyebrowClassName="text-blue-600"
        activeTabClassName="bg-blue-600 text-white shadow-md"
        inactiveTabClassName="bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
        buttonClassName="bg-blue-600 text-white hover:bg-blue-700"
        badgeText="New"
        badgeClassName="bg-blue-600 text-white"
        viewAllNoun="Latest Products"
        sectionClassName="bg-white py-10 md:py-14"
      />
    </>
  );
};

export default EcomArcHome;
