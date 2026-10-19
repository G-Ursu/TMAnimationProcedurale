import numpy as np
from numpy import linalg as la

def ConstrainDistance(anchor,point,distance):
    return (point-anchor)/la.norm(point-anchor)*distance+anchor
def Clamp(anchor,point,maxdistance):
    if la.norm(point-anchor)<=maxdistance:
        return point
    else:
        return ConstrainDistance(anchor,point,maxdistance)
#Forwards and Backwards Inverse Kinematics function definition
def FABRIK(limb, anchor, target, iterations, limb_lengths):
    limb[0] = anchor.copy()

    for _ in range(iterations):

        # --- Forward reaching ---
        limb[-1] = target.copy()
        for i in reversed(range(len(limb) - 1)):
            limb[i] = ConstrainDistance(
                limb[i + 1],
                limb[i],
                limb_lengths[i]
            )

        # --- Backward reaching ---
        limb[0] = anchor.copy()
        for i in range(len(limb) - 1):
            limb[i + 1] = ConstrainDistance(
                limb[i],
                limb[i + 1],
                limb_lengths[i]
            )
