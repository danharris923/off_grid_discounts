import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import { Deal } from '../types/Deal';
import { APP_CONSTANTS } from '../constants/app';
import './CompareSimilar.css';

interface CompareSimilarProps {
  currentDeal: Deal;
  allDeals: Deal[];
  onDealClick: (deal: Deal) => void;
}

const CompareSimilar: React.FC<CompareSimilarProps> = ({ 
  currentDeal, 
  allDeals, 
  onDealClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTogglingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const similarDeals = useMemo(() => {
    if (!currentDeal?.productName || !allDeals?.length) return [];
    
    // Filter out current deal
    const otherDeals = allDeals.filter(deal => deal.id !== currentDeal.id);
    
    // Extract important keywords from product name
    const extractKeywords = (productName: string): string[] => {
      const importantWords = [
        'jacket', 'coat', 'vest', 'hoodie', 'sweater', 'fleece', 'parka',
        'boots', 'shoes', 'sandals', 'sneakers', 'hiking', 'running',
        'backpack', 'bag', 'pack', 'duffel', 'tote', 'messenger',
        'tent', 'sleeping', 'bag', 'pad', 'mattress', 'pillow',
        'knife', 'multi-tool', 'flashlight', 'headlamp', 'lantern',
        'cooler', 'thermos', 'bottle', 'mug', 'tumbler',
        'gloves', 'hat', 'beanie', 'cap', 'scarf',
        'pants', 'shorts', 'jeans', 'leggings', 'tights',
        'shirt', 't-shirt', 'polo', 'tank', 'top',
        'watch', 'sunglasses', 'wallet', 'belt',
        'fishing', 'hunting', 'camping', 'hiking', 'outdoor'
      ];
      
      const words = productName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);
      
      const keywords = words.filter(word => importantWords.includes(word));
      
      // Add brand names and model numbers
      const brands = ['north', 'face', 'carhartt', 'yeti', 'under', 'armour', 'nike', 'adidas', 'columbia', 'patagonia'];
      const brandKeywords = words.filter(word => brands.includes(word));
      
      return Array.from(new Set([...keywords, ...brandKeywords]));
    };
    
    const currentKeywords = extractKeywords(currentDeal.productName);
    
    // If we have important keywords, search by those first
    if (currentKeywords.length > 0) {
      const keywordMatches = otherDeals.filter(deal => {
        const dealKeywords = extractKeywords(deal.productName);
        return dealKeywords.some(keyword => currentKeywords.includes(keyword));
      });
      
      if (keywordMatches.length > 0) {
        // Use fuse.js on keyword matches for better ranking
        const fuse = new Fuse(keywordMatches, {
          keys: [{ name: 'productName', weight: 1.0 }],
          threshold: 0.8, // Very lenient since we pre-filtered by keywords
          distance: 300,
          minMatchCharLength: 3,
          includeScore: true
        });
        
        const results = fuse.search(currentDeal.productName);
        return results
          .slice(0, APP_CONSTANTS.MAX_COMPARISON_RESULTS)
          .map(result => result.item);
      }
    }
    
    // Fallback to regular fuzzy search if no keyword matches
    const fuse = new Fuse(otherDeals, {
      keys: [{ name: 'productName', weight: 1.0 }],
      threshold: 0.4,
      distance: 200,
      minMatchCharLength: 3,
      includeScore: true
    });
    
    const results = fuse.search(currentDeal.productName);
    return results
      .slice(0, APP_CONSTANTS.MAX_COMPARISON_RESULTS)
      .map(result => result.item);
  }, [currentDeal, allDeals]);

  const formatPrice = (price: number | undefined | null): string => {
    if (!price || price <= 0) return '';
    return `$${price.toFixed(2)}`;
  };
  
  const getCurrentPrice = (deal: Deal): number | undefined => {
    return deal.salePrice || deal.amazonPrice || deal.cabelasPrice || deal.regularPrice;
  };

  const handleDealClick = React.useCallback((deal: Deal) => {
    if (deal.dealLink) {
      window.open(deal.dealLink, '_blank', 'noopener,noreferrer');
    }
  }, []);

  if (similarDeals.length === 0) {
    return null;
  }

  const handleCloseClick = () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setIsExpanded(false);
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseClick();
    }
  };

  const handleToggleClick = () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setIsExpanded(true);
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 200);
  };

  return (
    <>
      <button 
        onClick={handleToggleClick}
        className="compare-toggle"
        disabled={isTogglingRef.current}
      >
        Compare Similar ({similarDeals.length} found)
      </button>
      
      {isExpanded && createPortal(
        <div 
          key="compare-modal" 
          className="compare-overlay"
          onClick={handleBackdropClick}
        >
          <div 
            className="compare-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-header">
              <h3>Similar Products</h3>
              <button 
                className="close-btn"
                onClick={handleCloseClick}
              >
                ✕
              </button>
            </div>
            
            
            <div 
              ref={scrollContainerRef}
              className="popup-scroll"
            >
              {/* Show the original deal first */}
              <div 
                key={currentDeal.id} 
                className="popup-card"
                onClick={() => handleDealClick(currentDeal)}
              >
                <div className="popup-image-container">
                  <img 
                    src={currentDeal.imageUrl} 
                    alt={currentDeal.productName}
                    className="popup-image"
                    loading="lazy"
                  />
                  {currentDeal.featured && <span className="badge featured">Featured</span>}
                  {currentDeal.clearance && <span className="badge clearance">Clearance</span>}
                </div>
                
                <div className="popup-info">
                  <h4 className="popup-title">{currentDeal.productName}</h4>
                  
                  <div className="popup-price">
                    {(() => {
                      const displayPrice = getCurrentPrice(currentDeal);
                      const validPrice = displayPrice && displayPrice > 0;
                      
                      return !validPrice ? (
                        <span className="click-price">
                          {currentDeal.clearance ? "See clearance price" : 
                           currentDeal.featured ? "See special price" : 
                           `See price at ${currentDeal.retailer}`}
                        </span>
                      ) : (
                        <>
                          {currentDeal.regularPrice && currentDeal.salePrice && currentDeal.regularPrice > currentDeal.salePrice && (
                            <span className="regular-price">{formatPrice(currentDeal.regularPrice)}</span>
                          )}
                          <span className="sale-price">{formatPrice(displayPrice)}</span>
                          {currentDeal.discountPercent && currentDeal.discountPercent > 0 && (
                            <span className="savings-text">Save {currentDeal.discountPercent}%</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  <span className="popup-retailer">{currentDeal.retailer}</span>
                </div>
              </div>
              
              {/* Show similar deals */}
              {similarDeals.map(deal => {
                const displayPrice = getCurrentPrice(deal);
                const shouldHidePrice = !displayPrice || displayPrice <= 0;
                const validPrice = displayPrice && displayPrice > 0;
                
                return (
                  <div 
                    key={deal.id} 
                    className="popup-card"
                    onClick={() => handleDealClick(deal)}
                  >
                    <div className="popup-image-container">
                      <img 
                        src={deal.imageUrl} 
                        alt={deal.productName}
                        className="popup-image"
                        loading="lazy"
                      />
                      {deal.featured && <span className="badge featured">Featured</span>}
                      {deal.clearance && <span className="badge clearance">Clearance</span>}
                    </div>
                    
                    <div className="popup-info">
                      <h4 className="popup-title">{deal.productName}</h4>
                      
                      <div className="popup-price">
                        {!validPrice ? (
                          <span className="click-price">
                            {deal.clearance ? "See clearance price" : 
                             deal.featured ? "See special price" : 
                             `See price at ${deal.retailer}`}
                          </span>
                        ) : (
                          <>
                            {deal.regularPrice && deal.salePrice && deal.regularPrice > deal.salePrice && (
                              <span className="regular-price">{formatPrice(deal.regularPrice)}</span>
                            )}
                            <span className="sale-price">{formatPrice(displayPrice)}</span>
                            {deal.discountPercent && deal.discountPercent > 0 && (
                              <span className="savings-text">Save {deal.discountPercent}%</span>
                            )}
                          </>
                        )}
                      </div>
                      
                      <span className="popup-retailer">{deal.retailer}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default React.memo(CompareSimilar);