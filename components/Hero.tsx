import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import { FC } from 'react';
import { Button } from './ui/button';
import Image from 'next/image';

const HeroSection: FC = () => {
    const imageRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const imageElement = imageRef.current;
        if (!imageElement) return; 

        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            const scrollThreshold = 100;

            if (scrollPosition > scrollThreshold) {
                imageElement.classList.add('hero-image-scrolled'); 
            } else {
                imageElement.classList.remove('hero-image-scrolled'); 
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="pb-20 px-4">
            <div className="container mx-auto text-center">
                <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent font-extrabold tracking-tighter">
                    Manage Your Finances <br /> with Intelligence
                </h1>
                
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    An AI-powered financial management platform that helps you track, analyze, and optimize your spending with real-time insights.
                </p>
                
                <div className="flex justify-center space-x-4">
                    <Link href="/dashboard">
                        <Button size="lg">Get Started</Button>
                    </Link>
                    <Link href="/">
                        <Button size="lg" variant="outline" className="px-8">Learn More</Button>
                    </Link>
                </div>

                <div className="hero-image-wrapper">
                    <div ref={imageRef} className="hero-image transition-transform duration-500">
                        <Image 
                            alt="banner" 
                            src="/banner.jpeg" 
                            width={1280} 
                            height={720} 
                            priority 
                            className="rounded-lg shadow-2xl border mx-auto"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
