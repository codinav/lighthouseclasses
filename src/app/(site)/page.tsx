import { Hero } from "@/components/home/hero";
import {
  Categories,
  FeaturedCourses,
  FeaturedTeachers,
  FinalCTA,
  HomeFAQ,
  HomeLive,
  WhyUs,
} from "@/components/home/sections";

export default function HomePage() {
  return (
    <div className="-mt-16">
      <Hero />
      <Categories />
      <FeaturedCourses />
      <WhyUs />
      <FeaturedTeachers />
      <HomeLive />
      <HomeFAQ />
      <FinalCTA />
    </div>
  );
}
