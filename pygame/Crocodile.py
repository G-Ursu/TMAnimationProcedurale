# import modules
import sys
import pygame
import numpy as np
from numpy import linalg as la
from time import sleep, time
from ProceduralAnimation import *

# Define the background colour
background_colour = (0,0,0)
# Define colors
RED = (255,0,0)
GREEN = (0,255,0)
BLUE = (0,0,255)
YELLOW = (255,255,0)


#Define "followers", their directions and the proportion of the their previous velocity that they should keep
follower1=np.array([300,300],dtype=np.float32)
direction_follower1=np.array([0,0],dtype=np.float32)
keep_coefficient1=0.94
speed=0.8
follower2=np.array([300,300],dtype=np.float32)
direction_follower2=np.array([0,0],dtype=np.float32)
keep_coefficient2=0.99
head=follower2
bodysize=[1,1,1,1,3,5,7,9,15,19,15,19,11,9,15,13]
#body
body= []
body.append(head.copy())
for i in range(len(bodysize)):
    body.append(np.array([310+i,310+i],dtype=np.float32))
body.append(np.array([310,310],dtype=np.float32))
#arms
arm1= []
arm1.append(head.copy())
for i in range(2):
    arm1.append(np.array([201+i,201+i],dtype=np.float32))

arm2= []
arm2.append(head.copy())
for i in range(2):
    arm2.append(np.array([201+i,201+i],dtype=np.float32))


arm1_target1=body[2]+np.array([body[6][1]-body[4][1],body[4][0]-body[6][0]])
arm2_target1=body[2]+np.array([body[4][1]-body[6][1],body[6][0]-body[4][0]])
arm1_target2=arm1_target1
arm2_target2=arm2_target1

front_arm_lengths=[30,60]
# Define the dimensions of screen object(width,height)
screen = pygame.display.set_mode((1000, 1000))
pygame.display.set_caption('Example')
screen.fill(background_colour)
pygame.display.flip()

previous_time=time()
delta_time=0

running = True
# "game" loop
while running:
    current_time=time()
    delta_time=current_time-previous_time
    previous_time=current_time
# for loop through the event queue  
    for event in pygame.event.get():
    
        # Check for QUIT event      
        if event.type == pygame.QUIT:
            running = False
    #get mouse position, velocitty and predict it's position
    mouse_pos=np.array(pygame.mouse.get_pos(), dtype=np.float32)
    mouse_rel=np.array(pygame.mouse.get_rel(), dtype=np.float32)
    predicted_mouse_pos=mouse_pos+(mouse_rel*2)

    
    #update the directions and positions of the followers
    direction_follower1=(predicted_mouse_pos-follower1)/max(la.norm(predicted_mouse_pos-follower1),0.0001)*(1-keep_coefficient1)+(direction_follower1*keep_coefficient1)
    follower1=follower1+(speed*direction_follower1)
    direction_follower2=((follower1+direction_follower1*speed)-follower2)/max(la.norm(follower1+direction_follower1*speed-follower2),0.0001)*(1-keep_coefficient2)+(direction_follower2*keep_coefficient2)
    follower2=follower2+(speed*direction_follower2)
    head=follower2

    if la.norm(body[6]-arm1_target1)>100 or la.norm(body[6]-arm1_target1)<20:
        arm1_target1=body[2]+np.array([body[6][1]-body[4][1],body[4][0]-body[5][0]])*1.5
    if la.norm(body[6]-arm2_target1)>100 or la.norm(body[6]-arm2_target1)<20:
        arm2_target1=body[2]+np.array([body[4][1]-body[5][1],body[6][0]-body[4][0]])*1.5
    arm1_target2_direction=(arm1_target1-arm1_target2)/max(la.norm(arm1_target1-arm1_target2),0.0001)
    arm2_target2_direction=(arm2_target1-arm2_target2)/max(la.norm(arm2_target1-arm2_target2),0.0001)
    arm1_target2=arm1_target2+4*speed*arm1_target2_direction
    arm2_target2=arm2_target2+4*speed*arm2_target2_direction

    body[0]=head.copy()
    for i in range(len(body)-1):
        body[i+1]=ConstrainDistance(body[i],body[i+1],20)

    FABRIK(arm1,body[5],arm1_target2,3,front_arm_lengths)
    FABRIK(arm2,body[5],arm2_target2,3,front_arm_lengths)
    
    for i in range(len(arm1)):
        pygame.draw.circle(screen,(0,255,255),tuple(map(float, arm1[len(arm1)-i-1])),8)
    for i in range(len(arm2)):
        pygame.draw.circle(screen,(0,255,255),tuple(map(float, arm2[len(arm2)-i-1])),8)
    for i in range(len(body)-2):
        pygame.draw.circle(screen,(0,255-10*i,255-10*i),tuple(map(float, body[len(body)-i-1])),bodysize[i])
    for i in range(len(arm1)-1):
        pygame.draw.line(screen,(0,255,0),tuple(map(float, arm1[i])),tuple(map(float, arm1[i+1])),8)
    for i in range(len(arm2)-1):
        pygame.draw.line(screen,(0,255,0),tuple(map(float, arm2[i])),tuple(map(float, arm2[i+1])),8)
    #draw followers
    pygame.draw.circle(screen,RED,tuple(map(float, predicted_mouse_pos)),4)
    pygame.draw.circle(screen,GREEN,tuple(map(float, follower1)),5)
    pygame.draw.circle(screen,BLUE,tuple(map(float, follower2)),5)
    #pygame.draw.circle(screen,RED,tuple(map(float, arm1_target1)),10)
    #pygame.draw.circle(screen,RED,tuple(map(float, arm2_target1)),10)
 
    
    
    #update display
    pygame.display.flip()
    screen.fill((0,0,0))
    sleep(0.0005)
    
pygame.display.quit()
pygame.quit()
sys.exit()

