import React from "react";
import { FaFire, FaShoppingBag } from "react-icons/fa";
import { FaBolt, FaLayerGroup, FaRocket } from "react-icons/fa6";
import Banner from "./Banner";
import BrandLogoMarquee from "../components/BrandLogoMarquee";
import ProductShowcaseSection from "../components/ProductShowcaseSection";

const Home = () => {
  return (
    <>
      <Banner />
      <BrandLogoMarquee />
      <ProductShowcaseSection
        sectionId="top-categories"
        productType="Popular"
        variant="popular"
        eyebrow="Trending Now"
        title="Popular Products"
        description="Curated technology with a darker premium presentation, built from your live store data."
        icon={FaFire}
        badgeText="Limited"
        viewAllNoun="Popular Products"
      />
      <ProductShowcaseSection
        productType="Hot deals"
        variant="hot-deals"
        eyebrow="Limited Time Offers"
        title="Hot Deals"
        description="Exceptional value on the products your shoppers are most likely to grab quickly."
        icon={FaBolt}
        badgeText="Hot Deal"
        viewAllNoun="Hot Deals"
      />
      <ProductShowcaseSection
        productType="General"
        variant="featured"
        eyebrow="Featured Collections"
        title="Featured Products"
        description="Editorial-style catalogue highlights for the products you want to feel premium and carefully chosen."
        icon={FaShoppingBag}
        badgeText="Curated"
        viewAllNoun="Products"
        fallbackEndpointPath="/products/public"
      />
      <ProductShowcaseSection
        productType="Best Selling"
        variant="best-selling"
        eyebrow="Hot Sellers"
        title="Best Selling Products"
        description="A stronger gallery for the products already proving themselves with customers."
        icon={FaLayerGroup}
        badgeText="Best Seller"
        viewAllNoun="Best Sellers"
      />
      <ProductShowcaseSection
        productType="Latest"
        variant="latest"
        eyebrow="New Arrivals"
        title="Latest Products"
        description="Fresh inventory presented with a lighter launch-style section that feels new the moment it loads."
        icon={FaRocket}
        badgeText="New"
        viewAllNoun="Latest Products"
      />
    </>
  );
};

export default Home;
