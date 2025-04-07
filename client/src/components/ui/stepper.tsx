import React, { ReactNode } from 'react';
import { cn } from "@/lib/utils";

interface StepperProps {
  currentStep: number;
  className?: string;
  children: ReactNode;
}

interface StepProps {
  title: string;
  subtitle?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  className?: string;
}

export const Step: React.FC<StepProps> = ({ 
  title, 
  subtitle, 
  isActive, 
  isCompleted,
  className
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col items-center", 
        className
      )}
    >
      <div 
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center mb-2",
          isActive && "bg-primary text-primary-foreground",
          isCompleted && "bg-primary/80 text-primary-foreground",
          !isActive && !isCompleted && "bg-muted"
        )}
      >
        {isCompleted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="text-sm font-medium">
            {/* Display step number */}
          </span>
        )}
      </div>
      <div className="text-center">
        <div className={cn(
          "text-sm font-medium",
          isActive && "text-primary",
          !isActive && !isCompleted && "text-muted-foreground"
        )}>
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export const Stepper: React.FC<StepperProps> = ({ 
  currentStep, 
  className,
  children 
}) => {
  // Count the number of steps from the children
  const steps = React.Children.toArray(children);
  
  // Connector style for the line connecting steps
  const connector = steps.length > 1 ? (
    <div className="flex-1 h-px bg-muted mx-2 my-4 hidden sm:block" />
  ) : null;
  
  return (
    <div className={cn("flex items-start", className)}>
      {/* Render steps with connectors between them */}
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <React.Fragment key={index}>
            {/* If it's not the first step, add a connector before it */}
            {index > 0 && connector}
            
            {/* Clone the step element with additional props */}
            {React.cloneElement(step as React.ReactElement, {
              isActive,
              isCompleted,
              className: "flex-1"
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;