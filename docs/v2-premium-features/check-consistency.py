#!/usr/bin/env python3
"""
Consistency Checker for DeFiLlama Premium Features v2.0 Documentation
Checks consistency across PRD, Epic, User Stories, Tech Specs, and other docs
"""

import re
import os
from pathlib import Path
from typing import Dict, List, Tuple

class ConsistencyChecker:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.issues = []
        self.warnings = []
        self.successes = []
        
    def read_file(self, relative_path: str) -> str:
        """Read file content"""
        try:
            file_path = self.base_path / relative_path
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            self.issues.append(f"❌ Cannot read {relative_path}: {e}")
            return ""
    
    def extract_features_from_prd(self, content: str) -> Dict[str, List[str]]:
        """Extract features from PRD - improved parsing"""
        features = {
            'Q4 2025': [],
            'Q1 2026': [],
            'Q2 2026': [],
            'Q3 2026': []
        }

        # Find the "Core Features" section
        core_features_match = re.search(r'### 2\.2 Core Features.*?\n(.*?)(?=###|\Z)', content, re.DOTALL)
        if not core_features_match:
            return features

        core_section = core_features_match.group(1)

        # Extract features by quarter
        # Q4 2025
        q4_match = re.search(r'\*\*Q4 2025.*?\*\*.*?\n((?:\d+\..*?\n)+)', core_section, re.DOTALL)
        if q4_match:
            for line in q4_match.group(1).split('\n'):
                match = re.match(r'^\d+\.\s+(.+?)(?:\s+⭐.*)?$', line.strip())
                if match:
                    features['Q4 2025'].append(match.group(1).strip())

        # Q1 2026
        q1_match = re.search(r'\*\*Q1 2026.*?\*\*.*?\n((?:\d+\..*?\n)+)', core_section, re.DOTALL)
        if q1_match:
            for line in q1_match.group(1).split('\n'):
                match = re.match(r'^\d+\.\s+(.+?)$', line.strip())
                if match:
                    features['Q1 2026'].append(match.group(1).strip())

        # Q2 2026
        q2_match = re.search(r'\*\*Q2 2026.*?\*\*.*?\n((?:\d+\..*?\n)+)', core_section, re.DOTALL)
        if q2_match:
            for line in q2_match.group(1).split('\n'):
                match = re.match(r'^\d+\.\s+(.+?)$', line.strip())
                if match:
                    features['Q2 2026'].append(match.group(1).strip())

        # Q3 2026
        q3_match = re.search(r'\*\*Q3 2026.*?\*\*.*?\n((?:\d+\..*?\n)+)', core_section, re.DOTALL)
        if q3_match:
            for line in q3_match.group(1).split('\n'):
                match = re.match(r'^\d+\.\s+(.+?)$', line.strip())
                if match:
                    features['Q3 2026'].append(match.group(1).strip())

        return features
    
    def extract_epics_from_epic_doc(self, content: str) -> Dict[str, Dict]:
        """Extract EPIC information"""
        epics = {}
        
        # Extract EPIC table
        table_pattern = r'\| EPIC-(\d+) \| (.+?) \| (\d+) \| (\d+) \|'
        for match in re.finditer(table_pattern, content):
            epic_id = f"EPIC-{match.group(1)}"
            epics[epic_id] = {
                'name': match.group(2).strip(),
                'features': int(match.group(3)),
                'story_points': int(match.group(4))
            }
        
        return epics
    
    def extract_revenue_targets(self, content: str) -> Dict[str, str]:
        """Extract revenue targets"""
        targets = {}
        
        # Pattern: Q4 2025: $5M ARR
        pattern = r'(Q\d \d{4}):\s*\$(\d+(?:\.\d+)?M)\s*ARR'
        for match in re.finditer(pattern, content):
            quarter = match.group(1)
            revenue = match.group(2)
            targets[quarter] = revenue
        
        return targets
    
    def check_feature_count_consistency(self):
        """Check if feature counts match across documents"""
        print("\n" + "="*80)
        print("1. FEATURE COUNT CONSISTENCY CHECK")
        print("="*80)
        
        # Read PRD
        prd_content = self.read_file('2-plan/prd-v2.0.md')
        prd_features = self.extract_features_from_prd(prd_content)
        
        total_prd_features = sum(len(features) for features in prd_features.values())
        
        print(f"\n📄 PRD v2.0 Features:")
        for quarter, features in prd_features.items():
            print(f"  {quarter}: {len(features)} features")
            for i, feature in enumerate(features, 1):
                print(f"    {i}. {feature}")
        print(f"  TOTAL: {total_prd_features} features")
        
        # Read Epic
        epic_content = self.read_file('2-plan/epics/epic-v2.0.md')
        epics = self.extract_epics_from_epic_doc(epic_content)
        
        total_epic_features = sum(epic['features'] for epic in epics.values())
        total_epic_points = sum(epic['story_points'] for epic in epics.values())
        
        print(f"\n📊 Epic v2.0 Breakdown:")
        for epic_id, data in epics.items():
            print(f"  {epic_id}: {data['name']}")
            print(f"    Features: {data['features']}, Story Points: {data['story_points']}")
        print(f"  TOTAL: {total_epic_features} features, {total_epic_points} story points")
        
        # Check consistency
        if total_prd_features == total_epic_features:
            self.successes.append(f"✅ Feature count matches: {total_prd_features} features")
        else:
            diff = total_epic_features - total_prd_features
            self.warnings.append(
                f"⚠️  Feature count mismatch: PRD has {total_prd_features}, "
                f"Epic has {total_epic_features} (difference: +{diff})"
            )
            print(f"\n⚠️  MISMATCH: PRD ({total_prd_features}) vs Epic ({total_epic_features})")
            print(f"   Difference: +{diff} features (likely infrastructure/DevOps/integration)")
    
    def check_revenue_consistency(self):
        """Check revenue targets consistency"""
        print("\n" + "="*80)
        print("2. REVENUE TARGETS CONSISTENCY CHECK")
        print("="*80)
        
        # Read documents
        prd_content = self.read_file('2-plan/prd-v2.0.md')
        budget_content = self.read_file('4-implementation/budget/budget-approval-v2.0.md')
        brief_content = self.read_file('1-analysis/product-brief-v2.0.md')
        
        prd_targets = self.extract_revenue_targets(prd_content)
        budget_targets = self.extract_revenue_targets(budget_content)
        brief_targets = self.extract_revenue_targets(brief_content)
        
        print(f"\n📄 PRD Revenue Targets: {prd_targets}")
        print(f"💰 Budget Revenue Targets: {budget_targets}")
        print(f"📋 Brief Revenue Targets: {brief_targets}")
        
        # Check Q3 2026 target (final target)
        prd_final = prd_targets.get('Q3 2026', 'N/A')
        budget_final = budget_targets.get('Q3 2026', 'N/A')
        brief_final = brief_targets.get('Q3 2026', 'N/A')
        
        if prd_final == budget_final == brief_final:
            self.successes.append(f"✅ Revenue targets consistent: {prd_final} ARR by Q3 2026")
        else:
            self.warnings.append(
                f"⚠️  Revenue target mismatch: PRD={prd_final}, "
                f"Budget={budget_final}, Brief={brief_final}"
            )
    
    def check_story_points_consistency(self):
        """Check story points consistency - improved parsing"""
        print("\n" + "="*80)
        print("3. STORY POINTS CONSISTENCY CHECK")
        print("="*80)

        epic_content = self.read_file('2-plan/epics/epic-v2.0.md')
        epics = self.extract_epics_from_epic_doc(epic_content)

        total_epic_points = sum(epic['story_points'] for epic in epics.values())

        # Extract from user stories - look for "Total Story Points: XXX points"
        user_stories_content = self.read_file('2-plan/user-stories/user-stories-v2.0.md')

        # Try multiple patterns
        us_total_points = None

        # Pattern 1: "Total Story Points**: 640 points"
        match1 = re.search(r'\*\*Total Story Points\*\*:\s*(\d+)\s+points', user_stories_content, re.IGNORECASE)
        if match1:
            us_total_points = int(match1.group(1))

        # Pattern 2: "- **Total Story Points**: 640 points"
        if not us_total_points:
            match2 = re.search(r'-\s*\*\*Total Story Points\*\*:\s*(\d+)\s+points', user_stories_content, re.IGNORECASE)
            if match2:
                us_total_points = int(match2.group(1))

        print(f"\n📊 Epic v2.0 Total: {total_epic_points} story points")
        print(f"   Breakdown by EPIC:")
        for epic_id, data in sorted(epics.items()):
            print(f"   - {epic_id}: {data['story_points']} points ({data['name']})")

        if us_total_points:
            print(f"\n📝 User Stories v2.0 Total: {us_total_points} story points")

            if total_epic_points == us_total_points:
                self.successes.append(f"✅ Story points match: {total_epic_points} points")
                print(f"   ✅ MATCH: Both documents agree on {total_epic_points} points")
            else:
                diff = total_epic_points - us_total_points
                self.warnings.append(
                    f"⚠️  Story points mismatch: Epic has {total_epic_points}, "
                    f"User Stories has {us_total_points} (difference: +{diff})"
                )
                print(f"   ⚠️  MISMATCH: Difference of +{diff} points")
                print(f"   Explanation: Epic includes EPIC 7-9 (Integration, DevOps, Docs)")
                print(f"   - EPIC 1-6 (User Stories): {us_total_points} points")
                print(f"   - EPIC 7-9 (Infrastructure): {diff} points")
                print(f"   - Total (Epic doc): {total_epic_points} points")
        else:
            self.warnings.append("⚠️  Cannot extract story points from User Stories")
            print(f"   ⚠️  Could not find total story points in User Stories document")
    
    def check_tech_spec_coverage(self):
        """Check if tech specs exist for all EPICs"""
        print("\n" + "="*80)
        print("4. TECH SPEC COVERAGE CHECK")
        print("="*80)

        epic_content = self.read_file('2-plan/epics/epic-v2.0.md')
        epics = self.extract_epics_from_epic_doc(epic_content)

        print(f"\n📊 Checking tech spec coverage for {len(epics)} EPICs:")

        tech_spec_files = {
            'EPIC-1': '3-solutioning/tech-specs/tech-spec-epic-1-alerts.md',
            'EPIC-2': '3-solutioning/tech-specs/tech-spec-epic-2-tax.md',
            'EPIC-3': '3-solutioning/tech-specs/tech-spec-epic-3-portfolio.md',
            'EPIC-4': '3-solutioning/tech-specs/tech-spec-epic-4-gas-trading.md',
            'EPIC-5': '3-solutioning/tech-specs/tech-spec-epic-5-security.md',
            'EPIC-6': '3-solutioning/tech-specs/tech-spec-epic-6-analytics.md',
        }

        for epic_id, data in sorted(epics.items()):
            if epic_id in tech_spec_files:
                file_path = tech_spec_files[epic_id]
                full_path = self.base_path / file_path
                if full_path.exists():
                    print(f"  ✅ {epic_id}: {data['name']} - Tech spec exists")
                    self.successes.append(f"✅ Tech spec exists for {epic_id}")
                else:
                    print(f"  ❌ {epic_id}: {data['name']} - Tech spec MISSING")
                    self.issues.append(f"❌ Missing tech spec for {epic_id}")
            else:
                # EPIC 7-9 are infrastructure/cross-cutting, may not need separate tech specs
                print(f"  ⚠️  {epic_id}: {data['name']} - No tech spec expected (infrastructure)")
                self.warnings.append(f"⚠️  No tech spec for {epic_id} (infrastructure EPIC)")

    def check_file_existence(self):
        """Check if all expected files exist"""
        print("\n" + "="*80)
        print("5. FILE EXISTENCE CHECK")
        print("="*80)

        expected_files = [
            '1-analysis/bmad-analyst-report.md',
            '1-analysis/product-brief-v2.0.md',
            '2-plan/prd-v2.0.md',
            '2-plan/epics/epic-v2.0.md',
            '2-plan/roadmaps/roadmap-v2.0.md',
            '2-plan/user-stories/user-stories-v2.0.md',
            '3-solutioning/architecture/technical-architecture-premium-features-v2.md',
            '3-solutioning/database/database-schema-design-v2.md',
            '3-solutioning/tech-specs/tech-spec-epic-1-alerts.md',
            '3-solutioning/tech-specs/tech-spec-epic-2-tax.md',
            '3-solutioning/tech-specs/tech-spec-epic-3-portfolio.md',
            '3-solutioning/tech-specs/tech-spec-epic-4-gas-trading.md',
            '3-solutioning/tech-specs/tech-spec-epic-5-security.md',
            '3-solutioning/tech-specs/tech-spec-epic-6-analytics.md',
            '4-implementation/budget/budget-approval-v2.0.md',
            '4-implementation/sprints/sprint-planning-v2.0.md',
        ]

        print("\n📁 Checking expected files:")
        for file_path in expected_files:
            full_path = self.base_path / file_path
            if full_path.exists():
                print(f"  ✅ {file_path}")
                self.successes.append(f"✅ File exists: {file_path}")
            else:
                print(f"  ❌ {file_path}")
                self.issues.append(f"❌ Missing file: {file_path}")
    
    def generate_report(self):
        """Generate final consistency report"""
        print("\n" + "="*80)
        print("CONSISTENCY CHECK SUMMARY")
        print("="*80)
        
        print(f"\n✅ SUCCESSES ({len(self.successes)}):")
        for success in self.successes[:10]:  # Show first 10
            print(f"  {success}")
        if len(self.successes) > 10:
            print(f"  ... and {len(self.successes) - 10} more")
        
        print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
        for warning in self.warnings:
            print(f"  {warning}")
        
        print(f"\n❌ ISSUES ({len(self.issues)}):")
        for issue in self.issues:
            print(f"  {issue}")
        
        # Overall status
        print("\n" + "="*80)
        if len(self.issues) == 0 and len(self.warnings) == 0:
            print("🎉 ALL CHECKS PASSED - Documentation is fully consistent!")
        elif len(self.issues) == 0:
            print(f"⚠️  PARTIAL CONSISTENCY - {len(self.warnings)} warnings to review")
        else:
            print(f"❌ CONSISTENCY ISSUES FOUND - {len(self.issues)} critical issues")
        print("="*80)

def main():
    # Get the base path (current directory should be v2-premium-features/)
    base_path = Path(__file__).parent

    print("="*80)
    print("DeFiLlama Premium Features v2.0 - Consistency Checker v2.0")
    print("="*80)
    print(f"Base Path: {base_path}")
    print(f"Date: 2025-10-19")

    checker = ConsistencyChecker(base_path)

    # Run all checks
    checker.check_file_existence()
    checker.check_feature_count_consistency()
    checker.check_revenue_consistency()
    checker.check_story_points_consistency()
    checker.check_tech_spec_coverage()

    # Generate final report
    checker.generate_report()

if __name__ == "__main__":
    main()

