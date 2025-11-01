import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Example component test
describe('Component Testing Example', () => {
  it('should demonstrate basic component testing setup', () => {
    // This is an example test to verify the testing infrastructure works
    const TestComponent = () => <div>Hello Test</div>;

    render(<TestComponent />);

    expect(screen.getByText('Hello Test')).toBeDefined();
  });

  it('should handle button clicks', async () => {
    const TestButton = ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick}>Click Me</button>
    );

    const handleClick = vi.fn();
    render(<TestButton onClick={handleClick} />);

    const button = screen.getByRole('button', { name: 'Click Me' });
    button.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render with props', () => {
    const TestComponent = ({ title }: { title: string }) => <h1>{title}</h1>;

    render(<TestComponent title="Test Title" />);

    expect(screen.getByRole('heading', { name: 'Test Title' })).toBeDefined();
  });
});
