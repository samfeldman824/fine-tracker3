import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FineTypeToggle } from '../fine-type-toggle';

describe('FineTypeToggle', () => {
  it('renders all toggle options', () => {
    render(
      <FineTypeToggle value="Fine" onChange={() => {}} />
    );

    expect(screen.getByRole('radio', { name: /Fine/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Credit/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Warning/i })).toBeInTheDocument();
  });

  it('sets the correct initial selected value', () => {
    render(
      <FineTypeToggle value="Credit" onChange={() => {}} />
    );

    const creditButton = screen.getByRole('radio', { name: /Credit/i });
    expect(creditButton).toHaveAttribute('aria-checked', 'true');

    const fineButton = screen.getByRole('radio', { name: /Fine/i });
    expect(fineButton).toHaveAttribute('aria-checked', 'false');

    const warningButton = screen.getByRole('radio', { name: /Warning/i });
    expect(warningButton).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with new value when a toggle is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <FineTypeToggle value="Fine" onChange={handleChange} />
    );

    const warningButton = screen.getByRole('radio', { name: /Warning/i });
    await user.click(warningButton);

    expect(handleChange).toHaveBeenCalledWith('Warning');
  });

  it('does not call onChange if same toggle is clicked again', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <FineTypeToggle value="Fine" onChange={handleChange} />
    );

    const fineButton = screen.getByRole('radio', { name: /Fine/i });
    await user.click(fineButton);

    // `onValueChange` only fires when val is truthy AND different, so this shouldn’t call
    expect(handleChange).not.toHaveBeenCalled();
  });
});
