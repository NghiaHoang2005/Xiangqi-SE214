import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PieceToken, PIECE_CHARACTERS, PIECE_NAMES_VI } from './PieceToken';

afterEach(cleanup);

describe('PieceToken', () => {
  it('renders Red piece with traditional Chinese character and accessible label', () => {
    render(
      <svg>
        <PieceToken piece={{ type: 'GENERAL', side: 'RED' }} cx={100} cy={100} />
      </svg>,
    );

    const token = screen.getByRole('button', { name: PIECE_NAMES_VI.RED.GENERAL });
    expect(token).toBeTruthy();
    expect(token.getAttribute('class')).toContain('is-red');
    expect(screen.getByText(PIECE_CHARACTERS.RED.GENERAL)).toBeTruthy();
  });

  it('renders Black piece with distinct glyph', () => {
    render(
      <svg>
        <PieceToken piece={{ type: 'GENERAL', side: 'BLACK' }} cx={100} cy={100} />
      </svg>,
    );

    const token = screen.getByRole('button', { name: PIECE_NAMES_VI.BLACK.GENERAL });
    expect(token).toBeTruthy();
    expect(token.getAttribute('class')).toContain('is-black');
    expect(screen.getByText(PIECE_CHARACTERS.BLACK.GENERAL)).toBeTruthy();
  });

  it('handles click and keyboard activation', () => {
    const handleClick = vi.fn();
    render(
      <svg>
        <PieceToken
          piece={{ type: 'HORSE', side: 'RED' }}
          cx={100}
          cy={100}
          onClick={handleClick}
        />
      </svg>,
    );

    const token = screen.getByRole('button');
    fireEvent.click(token);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(token, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(token, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('applies selection styling and aria-pressed state', () => {
    const { container } = render(
      <svg>
        <PieceToken piece={{ type: 'SOLDIER', side: 'RED' }} cx={50} cy={50} selected={true} />
      </svg>,
    );

    const token = screen.getByRole('button');
    expect(token.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.piece-selection-halo')).toBeTruthy();
  });
});
