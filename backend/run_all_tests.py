"""Run all backend feature test scripts and print a consolidated summary.

Usage: python run_all_tests.py
"""
import importlib
import sys

TEST_MODULES = [
    'test_auth_rbac',
    'test_athlete_management',
    'test_wellness_feature',
    'test_injuries_concussion',
    'test_performance_tracking',
    'test_workload_acwr',
    'test_recovery_prehab',
    'test_dashboard_risk',
]


def main():
    results = {}
    for module_name in TEST_MODULES:
        print(f'\n>>> Running {module_name} ...')
        module = importlib.import_module(module_name)
        results[module_name] = module.main()

    print('\n' + '#' * 60)
    print('CONSOLIDATED TEST SUMMARY')
    print('#' * 60)
    failed_modules = []
    for module_name, exit_code in results.items():
        status = 'PASS' if exit_code == 0 else 'FAIL'
        print(f'  [{status}] {module_name}')
        if exit_code != 0:
            failed_modules.append(module_name)

    print('#' * 60)
    if failed_modules:
        print(f'{len(failed_modules)} of {len(TEST_MODULES)} suites reported failures.')
        return 1
    print(f'All {len(TEST_MODULES)} suites passed.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
