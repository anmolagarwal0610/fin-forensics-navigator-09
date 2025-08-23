import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import EnhancedDataFlowAnimationHorizontal from "./EnhancedDataFlowAnimationHorizontal";
import EnhancedDataFlowAnimationVertical from "./EnhancedDataFlowAnimationVertical";

const ResponsiveDataFlowAnimation: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Desktop & Tablet - Horizontal */}
      <div className="hidden md:flex w-full h-96">
        <EnhancedDataFlowAnimationHorizontal />
      </div>
      
      {/* Mobile - Vertical */}
      <div className="flex md:hidden w-full h-[32rem]">
        <EnhancedDataFlowAnimationVertical />
      </div>
    </>
  );
};

export default ResponsiveDataFlowAnimation;